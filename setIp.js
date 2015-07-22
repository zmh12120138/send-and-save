var fs=require('fs');
//获取本机IP
function getIPAdress(){
    var interfaces = require('os').networkInterfaces();
    for(var devName in interfaces){
        var iface = interfaces[devName];
        for(var i=0;i<iface.length;i++){
            var alias = iface[i];
            if(alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal){
                return alias.address;
            }
        }
    }
}
//把所有的localhost换成本机的IP地址
fs.readFile('./command.html',function(err,data){
    var newdata=data.toString().replace(/localhost/g,getIPAdress());
    fs.writeFile('./client.html',newdata,function(err){
       if(err) throw(err);
        console.log('localhost已被替换为'+getIPAdress());
    });
});