var redis=require('redis');
var client=redis.createClient(6379);
client.on('error',function(err){
    console.log(err);
})
for(var i=0;i<251;i++){
    for(var j=0;j<12;j++){
       for(var k=0;k<12;k++){
           var dd='originaldata'+i+':'+j+':'+k;
           client.del(dd);
       }
    }
}


