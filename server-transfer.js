var http=require('http');  //引入hptp模块
var express=require('express'); //引入express模块
var sio=require('socket.io');  //引入socket.io模块
var app=express();   //创建express实例
var morgan=require('morgan');  //引入morgon模块---用于存储日志
var fs = require('fs');  //引入fs模块
var redis=require('redis'); //引入redis模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var server=http.createServer(app);
var cp=require('child_process');  //引入child_process模块
var accessLogStream = fs.createWriteStream(__dirname + '/logs/accessTransfer.log', {flags: 'a'});
app.get('/',function(req,res){
    res.sendFile(__dirname+'/client.html');
});   //设置路由
app.use(morgan('combined', {stream: accessLogStream}));  //将访问日志写入accessTransfer.log中
server.listen(1337);
var socket=sio.listen(server);   //监听1337端口
var client=redis.createClient(settings.redis.port);   //建立redis客户端并连接至redis服务器
var saveData1= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData2= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData3= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData4= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
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
                var randomNum=Math.floor(Math.random()*4)+1;  //生成0-4之间的随机数,分别对应相应的子进程
                if(randomNum==1){
                    saveData1.send(messageSend);     //随机数为1的时候，向第一个子进程发送消息
                }
                if(randomNum==2){
                    saveData2.send(messageSend);   //随机数为2的时候，向第二个子进程发送消息
                }
                if(randomNum==3){
                    saveData3.send(messageSend);   //随机数为3的时候，向第三个子进程发送消息
                }
                if(randomNum==4){
                    saveData4.send(messageSend);  //随机数为4的时候，向第四个子进程发送消息
                }
            }
        });
    });
    socket.on('disconnect',function(){
        //监听disconnect事件
        console.log('已经断开传输通道连接！');
    });
});