var settings=require('./settings.js');  //引入自定义的setting.js模块
var mysql=require('mysql');  //引入Mysql模块
var redis=require('redis'); //引入redis模块
var connection=mysql.createConnection({host:settings.mysql.host,port:settings.mysql.port,database:settings.mysql.database,user:settings.mysql.user,password:settings.mysql.password});
//连接mysql数据库，设置信息在settings.js模块
var client=redis.createClient(settings.redis.port);   //建立redis客户端并连接至redis服务器
process.on('message',function(m){
    client.hgetall(m,function(err,response){
        //找到该条hash
        if(err) throw (err);
        else{
            if(response){
                connection.query('INSERT INTO originaldata SET ?',{originaldata:response.data,date:new Date()},function(err,result){
                    if(err){
                        errLogStream.write( '[' + new Date() + '] ' + '\n' + err.stack + '\n');
                        throw (err);
                    }
                    else{
                        //向控制台发送信息
                        console.log('数据已经存入数据库'+m);
                        client.del(m);      //删除缓存中对应的hash
                    }
                });//将从缓存中找到的原始数据存至数据库
            }

        }
    })
});


