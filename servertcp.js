var net=require('net');
var fs = require('fs');  //引入fs模块
var redis=require('redis'); //引入redis模块
var path=require('path');  //引入path模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var cp=require('child_process');  //引入child_process模块
var client=redis.createClient(settings.redis.port);   //建立redis客户端并连接至redis服务器
var server=net.createServer();
var connectionNum=0;
var saveData1= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData2= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData3= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var saveData4= cp.fork(__dirname+'/savedata.js'); //再次开启子进程
var child=cp.fork(__dirname+'/child.js');
server.on('connection',function(socket){
    connectionNum=connectionNum+1;
    console.log('当前连接数量：'+connectionNum);

    socket.on('data',function(data){
        console.log('收到命令，开始存入缓存');
        var messageSend={};
        client.lpush('originaldata',data.toString(),function(err,result){
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

    socket.on('end',function(){
        connectionNum=connectionNum-1;
        console.log('有客户端断开连接,当前连接数:'+connectionNum);
    });

    child.on('message',function(m){
        var timer=0;
        var progress;
        var intervalKey=null;
        function intervalsend(){
            timer++;
            progress=(timer/(m.frequency)*100).toFixed(2);
            socket.write(m.commandSend);
            console.log('命令已发送'+timer+'次   进度'+progress+'%');
            if(timer>=m.frequency){
                clearInterval(intervalKey);
                intervalKey=null;
                console.log('本次任务执行完毕！');
            }
        }
        intervalKey=setInterval(intervalsend,m.time*1000);
    });

});
server.listen(1337,'localhost');
