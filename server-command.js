var http=require('http');   //引入http模块
var express=require('express'); //引入express模块
var sio=require('socket.io'); //引入socket.io模块
var settings=require('./settings.js');  //引入settings.js模块---数据库设置
var mysql=require('mysql');  //引入Mysql模块
var app=express();  //创建express实例
var path=require('path');  //引入path模块
var parse=require('./js/parse.js');  //引入自定义的parse.js模块
var morgan=require('morgan');  //引入morgon模块---用于存储日志
var fs = require('fs');  //引入fs模块
var cluster=require('cluster');//引入cluster模块
var workers={};
var server=http.createServer(app);
var accessLogStream = fs.createWriteStream(__dirname + '/accessCommand.log', {flags: 'a'});
var errLogStream = fs.createWriteStream(__dirname + '/errCommand.log', {flags: 'a'});
app.use(morgan('combined', {stream: accessLogStream}));  //将访问日志写入accessCommand.log中
app.use(function(err, req, res, next){
    var meta = '[' + new Date() + '] ' + req.url + '\n';
    errLogStream.write(meta + err.stack + '\n');
    console.log('出现错误，已保存到errCommand.log文件中'+meta+err.stack);
    next();
});     //将错误日志写入errCommand.log中
app.get('/',function(req,res){
    res.sendfile(__dirname+'/command.html');
});   //设置路由，当客户端请求'/'时，发送文件command.html
app.use(express.static(path.join(__dirname, 'public')));  //设置public文件夹为静态资源文件夹
if(cluster.isMaster){
    var child1=cluster.fork();
    var child2=cluster.fork();
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
    });
}else{
    server.listen(1338);
    var socket=sio.listen(server);  //监听1338端口
    var clientCode=0;
    var connection=mysql.createConnection({host:settings.mysql.host,port:settings.mysql.port,database:settings.mysql.database,user:settings.mysql.user,password:settings.mysql.password});
//连接至Mysql数据库
    socket.on('connection',function(socket){
        //监听connection事件
        console.log('与客户端的命令连接通道已经建立');
        socket.emit('clientCode',Math.floor(Math.random()*1000000)+1);   //向客户端发送clientCode时间，为客户端制定客户端编码
        socket.on('meterReading',function(data){
            //监听meterReading事件
            connection.query('INSERT INTO log SET ?',{code:data.code,meterid:data.meterid,date:new Date(),commandSend:data.commandSend},function(err,result){
                if(err){
                    errLogStream.write( '[' + new Date() + '] ' + '\n' + err.stack + '\n');
                    throw (err);
                }
                console.log('已保存命令日志到数据库!');
            });   //保存抄表命令到数据库的log表中
            connection.query('SELECT time,frequency FROM setting WHERE id=1',function(err,result){
                //查询数据中的抄表命令设置信息，间隔时间和次数
                if(err){
                    errLogStream.write( '[' + new Date() + '] ' + '\n' + err.stack + '\n');
                    throw(err);
                }
                else{
                    console.log('收到命令,命令代码为:'+data.commandSend+'配置信息为: 时间间隔：'+result[0].time+'   次数:'+result[0].frequency);
                    //向控制台发送信息
                    var timer=0;
                    var process;
                    var intervalKey=null;
                    function intervalsend(){
                        timer++;
                        process=(timer/(result[0].frequency)*100).toFixed(2);
                        socket.broadcast.emit('start',data);
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
                if(err){
                    errLogStream.write( '[' + new Date() + '] ' + '\n'+ err.stack + '\n');
                    throw(err);
                }
                else{console.log('配置信息保存成功！')}
            })  //将配置信息保存至数据库的setting表中
        })
        socket.on('disconnect',function(){
            //监听disconnect事件
            console.log('已经断开命令通道连接！');
        });
    });
}