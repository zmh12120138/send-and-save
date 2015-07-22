var http=require('http');  //引入hptp模块
var express=require('express'); //引入express模块
var sio=require('socket.io');  //引入socket.io模块
var app=express();   //创建express实例
var morgan=require('morgan');  //引入morgon模块---用于存储日志
var fs = require('fs');  //引入fs模块
var redis=require('redis'); //引入redis模块
var path=require('path');  //引入path模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var server=http.createServer(app);
var cp=require('child_process');  //引入child_process模块
var accessLogStream = fs.createWriteStream(__dirname + '/logs/accessTransfer.log', {flags: 'a'});
app.get('/',function(req,res){
    res.sendFile(__dirname+'/client.html');
});   //设置路由
app.get('/command',function(req,res){
    res.sendFile(__dirname+'/command.html');
});   //设置路由
app.use(morgan('combined', {stream: accessLogStream}));  //将访问日志写入accessTransfer.log中
app.use(express.static(path.join(__dirname, 'public')));  //设置public文件夹为静态资源文件夹
server.listen(1337);
var socket=sio.listen(server);   //监听1337端口
var client=redis.createClient(settings.redis.port);   //建立redis客户端并连接至redis服务器
var connection=mysql.createConnection({host:settings.mysql.host,port:settings.mysql.port,database:settings.mysql.database,user:settings.mysql.user,password:settings.mysql.password});
var connectionNum=0;
var saveData1= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData2= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData3= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData4= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
socket.on('connection',function(socket){
    //监听connection事件
    connectionNum=connectionNum+1;
    console.log('当前连接数量：'+connectionNum);
    socket.on('message',function(data){
        //监听sendData事件
        console.log('收到命令，开始存入缓存');
        var messageSend={};
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
    socket.on('meterReading',function(data){
        //监听meterReading事件
        connection.query('INSERT INTO log SET ?',{code:data.code,meterid:data.meterid,date:new Date(),commandSend:data.commandSend},function(err,result){
            if(err)  throw (err);
            console.log('已保存命令日志到数据库!');
        });   //保存抄表命令到数据库的log表中

        connection.query('SELECT time,frequency FROM setting WHERE id=1',function(err,result){
            //查询数据中的抄表命令设置信息，间隔时间和次数
            if(err) throw(err);
            else{
                console.log('收到命令,命令代码为:'+data.commandSend+'配置信息为: 时间间隔：'+result[0].time+'   次数:'+result[0].frequency);
                //向控制台发送信息
                var timer=0;
                var process;
                var intervalKey=null;
                function intervalsend(){
                    timer++;
                    process=(timer/(result[0].frequency)*100).toFixed(2);
                    socket.broadcast.send(data);
                    console.log('命令已发送'+timer+'次   任务编号： '+data.code+' 进度'+process+'%');
                    if(timer>=result[0].frequency){
                        clearInterval(intervalKey);
                        intervalKey=null;
                        console.log('本次任务执行完毕！'+'   任务编号：'+data.code);
                    }
                }
                intervalKey=setInterval(intervalsend,result[0].time*1000);
                //根据设置信息，间隔多长时间向所有客户端广播一次’start'事件
            }
        });
    });

    socket.on('setInfo',function(data){
        //监听setInfo事件
        console.log('正在修改配置信息!');
        connection.query('UPDATE setting SET ? WHERE id=1',{time:data.time,frequency:data.frequency},function(err,result){
            if(err)  throw(err);
            else{console.log('配置信息保存成功！')}
        });  //将配置信息保存至数据库的setting表中
    });

    socket.on('disconnect',function(){
        //监听disconnect事件
        connectionNum=connectionNum-1;
        console.log('已经断开命令通道连接！当前连接数量:'+connectionNum);
    });
});