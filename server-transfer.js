var http=require('http');  //引入hptp模块
var express=require('express'); //引入express模块
var sio=require('socket.io');  //引入socket.io模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var app=express();   //创建express实例
var parse=require('./js/parse.js');  //引入自定义的parse.js模块
var cluster=require('cluster');  //引入cluster模块
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
    //主进程分支
    cluster.on('death', function (worker) {    // 当一个工作进程结束时，重启工作进程
    delete workers[worker.pid];
    worker = cluster.fork();
    workers[worker.pid] = worker;
    });
    //初始开启与CPU数量相同的工作进程
    for(var i=0;i<numCPUs;i++){
        var worker=cluster.fork();
        workers[worker.pid]=worker;
    }
}else{
    //工作进程分支，启动服务器
    server.listen(1337);
    var socket=sio.listen(server);   //监听1337端口

    var connection=mysql.createConnection({host:settings.host,port:settings.port,database:settings.database,user:settings.user,password:settings.password});
   //连接mysql数据库，设置信息在settings.js模块
    socket.on('connection',function(socket){
        //监听connection事件
        console.log('与客户端的传输通道建立');
        socket.on('send',function(data){
            //监听send事件
            var cold=parse.parseCold(data.send); //解析cold字段
            var warm=parse.parseWarm(data.send);  //解析warm字段
            var meterid=parse.parseMeterid(data.send); //解析meterid字段
            var power=parse.parsePower(data.send);  //解析power字段
            var flow=parse.parseFlow(data.send);  //解析flow字段
            var flowacc=parse.parseFlowacc(data.send);  //解析flowacc字段---流量总计
            var temwatersupply=parse.parseTemwatersupply(data.send); //解析temwatersupply字段---供水温度
            var temwaterreturn=parse.parseTemwaterreturn(data.send);  //解析temwaterreturn字段---回水温度
            var worktime=parse.parseWorktime(data.send); //解析worktime字段---工作时间
            var metertime=parse.parseMetertime(data.send);  //解析metertime字段---表内时间
            var status=parse.parseStatus(data.send);  //解析status字段---状态
            connection.query('INSERT INTO test1 SET ?',{meterid:meterid,cold:cold,warm:warm,power:power,flow:flow,flowacc:flowacc,temwatersupply:temwatersupply,temwaterreturn:temwaterreturn,worktime:worktime,metertime:metertime,status:status},function(err,result){
                if(err) throw (err);
                //向控制台发送信息
                console.log('数据接收完毕！  任务编号:'+data.code+'由子进程'+cluster.worker.id+'处理');
            });   //将解析结果写入数据库
        });

        socket.on('disconnect',function(){
            //监听disconnect事件
            console.log('已经断开传输通道连接！');
        })
    });
}
