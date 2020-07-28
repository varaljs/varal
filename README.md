<br>

<p align="center">
<img src="https://pty-ink.oss-cn-hangzhou.aliyuncs.com/varal.png?x-oss-process=style/width_400" alt="Logo">
</p>

# Varal

Varal 是一个轻量级的 Web 服务框架

欢迎 PR

[![NPM Version][npm-image]][npm-url]
[![Maintainability](https://api.codeclimate.com/v1/badges/ea102682c12c00a174f1/maintainability)](https://codeclimate.com/github/dmpty/varal/maintainability)

[npm-image]: https://img.shields.io/npm/v/varal.svg
[npm-url]: https://npmjs.org/package/varal

## Features

* 流畅易用的 MVC 开发体验
* 模板引擎 [art-template](https://github.com/aui/art-template)
* 服务容器与依赖注入
* 插件机制


## Installation

```bash
$ npm install varal --save
```

## Basic Usage

```javascript
const varal = require('varal');
const server = new varal();
server.get('/', app => {
    app.text('Hello World');
});
server.run();
```
运行文件，访问 `localhost:8888` 即可看到文本输出。

## Document

[Varal - 中文文档](https://github.com/varaljs/varal/wiki)
