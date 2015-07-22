var http=require('http');   //引入http模块
var express=require('express'); //引入express模块
var sio=require('socket.io'); //引入socket.io模块
var settings=require('./settings.js');  //引入settings.js模块---数据库设置
var mysql=require('mysql');  //引入Mysql模块
var app=express();  //创建express实例
var path=require('path');  //引入path模块
var morgan=require('morgan');  //引入morgon模块---用于存储日志
var fs = require('fs');  //引入fs模块
var server=http.createServer(app);
var accessLogStream = fs.createWriteStream(__dirname + '/logs/accessCommand.log', {flags: 'a'});
app.use(morgan('combined', {stream: accessLogStream}));  //将访问日志写入accessCommand.log中
app.get('/',function(req,res){
    res.sendFile(__dirname+'/command.html');
});   //设置路由，当客户端请求'/'时，发送文件command.html
app.use(express.static(path.join(__dirname, 'public')));  //设置public文件夹为静态资源文件夹
server.listen(1338);
var socket=sio.listen(server);  //监听1338端口
var clientCode=0;
var connection=mysql.createConnection({host:settings.mysql.host,port:settings.mysql.port,database:settings.mysql.database,user:settings.mysql.user,password:settings.mysql.password});
//连接至Mysql数据库
var connectionNum=0;
socket.on('connection',function(socket){
    //监听connection事件
    connectionNum=connectionNum+1;
    console.log('当前连接数量：'+connectionNum);
    console.log('与客户端的命令连接通道已经建立');


    socket.on('disconnect',function(){
        //监听disconnect事件
        connectionNum=connectionNum-1;
        console.log('已经断开命令通道连接！当前连接数量:'+connectionNum);
    });
});