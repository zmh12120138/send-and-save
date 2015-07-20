var http=require('http');  //引入hptp模块
var express=require('express'); //引入express模块
var sio=require('socket.io');  //引入socket.io模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var app=express();   //创建express实例
var cp=require('child_process');  //引入child_process模块
var morgan=require('morgan');  //引入morgon模块---用于存储日志
var fs = require('fs');  //引入fs模块
var redis=require('redis'); //引入redis模块
var server=http.createServer(app);
var accessLogStream = fs.createWriteStream(__dirname + '/accessTransfer.log', {flags: 'a'});
var errLogStream = fs.createWriteStream(__dirname + '/errTransfer.log', {flags: 'a'});
app.get('/',function(req,res){
    res.sendfile(__dirname+'/client.html');
});   //设置路由
app.use(morgan('combined', {stream: accessLogStream}));  //将访问日志写入accessTransfer.log中
app.use(function(err, req, res, next){
    var meta = '[' + new Date() + '] ' + req.url + '\n';
    errLogStream.write(meta + err.stack + '\n');
    console.log('出现错误，已保存到errTransfer.log文件中'+meta+err.stack);
    next();
});     //将错误日志写入errTransfer.log中
server.listen(1337);
var socket=sio.listen(server);   //监听1337端口
var client=redis.createClient(settings.redis.port);   //建立redis客户端并连接至redis服务器
var saveData1= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData2= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData3= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
socket.on('connection',function(socket){
    //监听connection事件
    console.log('与客户端的传输通道建立');
    socket.on('sendData',function(data){
        //监听sendData事件
        console.log('收到命令，开始存入缓存');
        var clientCode=data.clientCode;
        var messageSend={};
        messageSend.clientCode=clientCode;
        client.lpush('originaldata',data.send,function(err,result){
            if(err) throw (err);
            else{
                var randomNum=Math.floor(Math.random()*3)+1;
                if(randomNum==1){
                    messageSend.childId=1;
                    saveData1.send(messageSend);
                }
                if(randomNum==2){
                    messageSend.childId=2;
                    saveData2.send(messageSend);
                }
                if(randomNum==3){
                    messageSend.childId=3;
                    saveData3.send(messageSend);
                }
            }
        })
    });
    socket.on('disconnect',function(){
        //监听disconnect事件
        errLogStream.write( '[' + new Date() + '] ' + '\n' + '有客户端断开连接' + '\n');
        console.log('已经断开传输通道连接！');
    })
});