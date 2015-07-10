var http=require('http');
var express=require('express');
var sio=require('socket.io');
var settings=require('./settings.js');
var mysql=require('mysql');
var app=express();
var parse=require('./js/parse.js');
var server=http.createServer(app);
app.get('/',function(req,res){
    res.sendfile(__dirname+'/client.html');
});
server.listen(1337);
var socket=sio.listen(server);

var connection=mysql.createConnection({host:settings.host,port:settings.port,database:settings.database,user:settings.user,password:settings.password});
socket.on('connection',function(socket){
    console.log('与客户端的传输通道建立');
    socket.on('send',function(data){
        var cold=parse.parseCold(data.send);
        var warm=parse.parseWarm(data.send);
        var meterid=parse.parseMeterid(data.send);
        var power=parse.parsePower(data.send);
        var flow=parse.parseFlow(data.send);
        var flowacc=parse.parseFlowacc(data.send);
        var temwatersupply=parse.parseTemwatersupply(data.send);
        var temwaterreturn=parse.parseTemwaterreturn(data.send);
        var worktime=parse.parseWorktime(data.send);
        var metertime=parse.parseMetertime(data.send);
        var status=parse.parseStatus(data.send);
        connection.query('INSERT INTO test1 SET ?',{meterid:meterid,cold:cold,warm:warm,power:power,flow:flow,flowacc:flowacc,temwatersupply:temwatersupply,temwaterreturn:temwaterreturn,worktime:worktime,metertime:metertime,status:status},function(err,result){
            if(err) throw (err);
            console.log('数据接收完毕！  任务编号:'+data.code);
        });
    });

    socket.on('disconnect',function(){
        console.log('已经断开传输通道连接！');
    })
});