var http=require('http');
var express=require('express');
var sio=require('socket.io');
var settings=require('./settings.js');
var mysql=require('mysql');
var app=express();
var path=require('path');
var parse=require('./js/parse.js');
var server=http.createServer(app);
app.get('/',function(req,res){
    res.sendfile(__dirname+'/command.html');
});
app.use(express.static(path.join(__dirname, 'public')));
server.listen(1338);
var socket=sio.listen(server);

var connection=mysql.createConnection({host:settings.host,port:settings.port,database:settings.database,user:settings.user,password:settings.password});
socket.on('connection',function(socket){
    console.log('与客户端的命令连接已建立');
   socket.on('meterReading',function(data){

       connection.query('INSERT INTO log SET ?',{code:data.code,meterid:data.meterid,date:new Date()},function(err,result){
           if(err) throw (err);
           console.log('已保存日志到数据库!');
       });
       connection.query('SELECT time,frequency FROM setting WHERE id=1',function(err,result){
           if(err) throw(err);
           else{
               console.log('收到命令,命令代码为:'+data.meterNum+'配置信息为: 时间间隔：'+result[0].time+'   次数:'+result[0].frequency);
               var timer=0;
               var intervalKey=null;
               function intervalsend(){
                   timer++;
                   socket.broadcast.emit('start',data);
                   console.log('命令已发送'+timer+'次   任务编号： '+data.code);
                   if(timer>=result[0].frequency){
                       clearInterval(intervalKey);
                       intervalKey=null;
                       console.log('本次任务执行完毕！'+'   任务编号：'+data.code);
                   }
               }
               intervalKey=setInterval(intervalsend,result[0].time*1000);
           }
       })
   })
    socket.on('setInfo',function(data){
        console.log('正在修改配置信息!');
        connection.query('UPDATE setting SET ? WHERE id=1',{time:data.time,frequency:data.frequency},function(err,result){
            if(err) throw(err);
            else{console.log('配置信息保存成功！')}
        })
    })
    socket.on('disconnect',function(){
        console.log('已经断开命令通道连接！');
    })
});