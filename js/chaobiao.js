var commond=io.connect("http://localhost:1338");
function chaobiao() {
    var meterid = document.getElementById('meterid').value;
    var time = document.getElementById('time').value;
    var frequency = document.getElementById('frequency').value;
    var code = document.getElementById('code').value;
    if (meterid.length != 8) {
        document.getElementById('errMsg').innerHTML = "表号长度输入错误！"
        return false;
    }
    if (time == '') {
        document.getElementById('errMsg').innerHTML = "时间不能为空！"
        return false;
    }
    if (frequency == '') {
        document.getElementById('errMsg').innerHTML = "次数不能为空！"
        return false;
    }
    if (code == '') {
        document.getElementById('errMsg').innerHTML = "任务编号不能为空！"
        return false;
    }
    var parse1 = meterid.slice(0, 2);
    var parse2 = meterid.slice(2, 4);
    var parse3 = meterid.slice(4, 6);
    var parse4 = meterid.slice(6, 8);
    var meterNum = 'FE FE FE FE ' + parse4 + ' ' + parse3 + ' ' + parse2 + ' ' + parse1 + ' ' + '00 11 11 01 03 1F 90 12 82 16';
    var data = {};
    data.meterNum = meterNum;
    data.time = time;
    data.frequency = frequency;
    data.code = code;
    data.meterid = meterid;
    document.write('抄表，命令为' + meterNum + '    间隔时间：' + time + '秒' + '   任务总次数：' + frequency);
    commond.emit('chaobiao', data);
    alert('命令已发送！');
}