var parse=require('./js/parse.js');  //引入自定义的parse.js模块
var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var connection=mysql.createConnection({host:settings.host,port:settings.port,database:settings.database,user:settings.user,password:settings.password});
//连接mysql数据库，设置信息在settings.js模块

process.on('message',function(m){
    var afterparse = parse.parseAll(m); //并调用parse模块中的parseAll方法解析数据
    connection.query('INSERT INTO test1 SET ?', {meterid: afterparse.meterid, cold: afterparse.cold, warm: afterparse.warm, power: afterparse.power, flow: afterparse.flow, flowacc: afterparse.flowacc, temwatersupply: afterparse.temwatersupply, temwaterreturn: afterparse.temwaterreturn, worktime: afterparse.worktime, metertime: afterparse.metertime, status: afterparse.status}, function (err, result) {
        if (err) throw (err);
        else console.log('本条记录解析完毕');
    });  //将解析后的数据存储至数据库
})




