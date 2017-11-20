<br>

<p align="center">
<img src="http://www.pty.ink/varal-400.png" alt="Logo">
</p>

# Varal

Laravel 风格，轻量级，使用 ES6 特性编写的，面向对象的 Web 服务框架

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/varal.svg
[npm-url]: https://npmjs.org/package/varal

## Features 功能

* 路由与路由组
* 中间件
* 控制器
* 模板引擎 `Handlebars`
* IoC 与 DI 的设计模式

## Installation 安装

```bash
$ npm install varal --save
```

## Basic Usage 基本使用

```javascript
const varal = require('varal');
const server = new varal();
server.get('/', app => {
    app.text('Hello World');
});
```
访问 `localhost:8888` 即可看到文本的输出。

## Document 文档

[Varal - 中文文档](http://d.varal.pty.ink)