var parse=require('./js/parse.js');  //引入自定义的parse.js模块
var cluster=require('cluster');  //引入cluster模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var fs = require('fs');  //引入fs模块
var os=require('os');   //引入os模块
var numCPUs=os.cpus().length;   //获取CPU的数量
var workers={};
var connection=mysql.createConnection({host:settings.host,port:settings.port,database:settings.database,user:settings.user,password:settings.password});
//连接mysql数据库，设置信息在settings.js模块

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
    //在父进程中从数据库中读取原始数据，并发送给子进程
    connection.query('SELECT * FROM originaldata',function(err,result){
        if(err) throw (err);
        workers[worker.pid].send(result);
    })

}else {
    //子进程收到父进程发送的数据
    process.on('message', function (result) {
        //遍历父进程传过来的对象数组result
        for (var i = 0; i < result.length; i++) {
            var afterparse = parse.parseAll(result[i].originaldata); //并调用parse模块中的parseAll方法解析数据
            connection.query('INSERT INTO test1 SET ?', {meterid: afterparse.meterid, cold: afterparse.cold, warm: afterparse.warm, power: afterparse.power, flow: afterparse.flow, flowacc: afterparse.flowacc, temwatersupply: afterparse.temwatersupply, temwaterreturn: afterparse.temwaterreturn, worktime: afterparse.worktime, metertime: afterparse.metertime, status: afterparse.status}, function (err, result) {
                if (err) throw (err);
                else console.log('由子进程' + cluster.worker.id + '处理');
            });  //将解析后的数据存储至数据库
        }
        console.log('解析完毕');  //向控制台发送信息，处理完毕
    });
}