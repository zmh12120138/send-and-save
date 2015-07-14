var http=require('http');  //引入hptp模块
var express=require('express'); //引入express模块
var sio=require('socket.io');  //引入socket.io模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var app=express();   //创建express实例
var parse=require('./js/parse.js');  //引入自定义的parse.js模块
var cluster=require('cluster');  //引入cluster模块
var cp=require('child_process');
var os=require('os');   //引入os模块
var morgan=require('morgan');  //引入morgon模块---用于存储日志
var fs = require('fs');  //引入fs模块
var numCPUs=os.cpus().length;   //获取CPU的数量
var workers={};
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
if(cluster.isMaster){
    //初始开启与CPU数量相同的工作进程
    for(var i=0;i<numCPUs;i++){
        var worker=cluster.fork();
        workers[worker.pid]=worker;
    }
    //主进程分支

    cluster.on('exit',function(worker,code,signal){   //当一个进程关闭后，重新开启一个进程
        delete workers[worker.pid];
        worker = cluster.fork();
        workers[worker.pid] = worker;
        if(worker.suicide===true){
            console.log('子进程%d自动退出',worker.id+'已开启新的子进程');
        }
        else{
            console.log('子进程%d异常退出,已开启新的子进程，退出代码为%d',worker.id,code);
        }
        if(signal){
            console.log('退出信号为%s',signal);
        }
    })
}else{
    //工作进程分支，启动服务器
    server.listen(1337);
    var socket=sio.listen(server);   //监听1337端口
    var parse= cp.fork(__dirname+'/server-parse.js'); //再次开启子进程，运行sever-parse模块
    var connection=mysql.createConnection({host:settings.host,port:settings.port,database:settings.database,user:settings.user,password:settings.password});
   //连接mysql数据库，设置信息在settings.js模块
    socket.on('connection',function(socket){
        //监听connection事件
        console.log('与客户端的传输通道建立');
        socket.on('send',function(data){
            //监听send事件
            parse.send(data.send);  //向名字为parse的子进程发送数据，数据为data.send
            connection.query('INSERT INTO originaldata SET ?',{originaldata:data.send,date:new Date()},function(err,result){
                if(err){
                    errLogStream.write( '[' + new Date() + '] ' + '\n' + err.stack + '\n');
                    throw (err);
                }
                else{
                    //向控制台发送信息
                    console.log('数据接收完毕！  任务编号:'+data.code+'由子进程'+cluster.worker.id+'处理');

                }
            });//将接收到的原始数据存至数据库
        });

        socket.on('disconnect',function(){
            //监听disconnect事件
            console.log('已经断开传输通道连接！');
        })

    });
}
