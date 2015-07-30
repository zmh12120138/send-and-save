var net=require('net');
var server=net.createServer();
var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var connection=mysql.createConnection({host:settings.mysql.host,port:settings.mysql.port,database:settings.mysql.database,user:settings.mysql.user,password:settings.mysql.password});
server.on('connection',function(socket){
    socket.setKeepAlive(true,10000);   //设置保持运行,每隔10秒向客户端发送一个带有ACK标志的空TCP包来触发客户端的空应答
    socket.setNoDelay(true);      //设置无延时
    server.getConnections(function(err,count){
        console.log('当前连接数量:'+count);
    });
    socket.on('data',function(data){

        var decode=data.toString('hex');
        console.log(decode);

        connection.query('INSERT INTO originaldata SET ?', {originaldata: decode, date: new Date()}, function (err, result) {
            if (err)  throw (err);
            else {
                console.log('数据已经存入数据库!');
            }
        });  //将原始数据插入数据库的originaldata表中
    });

    socket.on('error',function(err){
        console.log('与客户端通信的过程中发生了一个错误,错误编码为s%',err.code);
        socket.destroy;
    });       //当客户端或者服务器在未断开连接的情况下,关闭了,会触发此error事件

    socket.on('end',function(){
        server.getConnections(function(err,count){
            console.log('当前连接数量:'+count);
        });
    });    //当客户端与服务器正常断开连接后,触发此end事件

    socket.on('close',function(had_error){
        if(had_error){
            console.log('由于一个错误导致socket端口被关闭。');
        }else{
            console.log('socket端口被正常关闭。');
        }
    })  //检测socket端口关闭是否有错误

});
server.on('error', function(err) {
    console.log('Error occurred:'+ err.message);
});
server.listen(1337);
server.on('close',function(){  //监听服务器关闭的事件close
    console.log('TCP服务器被关闭');
});
process.on('uncaughtException', function(err) {
    console.log('监听到未捕获错误,服务器关闭')
    server.close();
});