@echo off
set num=0
:ok
set /a num+=1
cd C:\send and save
start node client.js
if "%num%"=="100" pause&&echo.开启100个客户端啦！
goto ok