# Varal

Laravel 风格，轻量级的 Web 服务框架

[![NPM Version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/varal.svg
[npm-url]: https://npmjs.org/package/varal

## Features 功能

* Simple Route and RouteGroup
* Controller
* Middleware
* Template Engine `Handlebars`

## Installation 安装

```bash
$ npm install varal --save
```

## Document 文档

### 基本使用

```javascript
const varal = require('varal');
const server = new varal();
server.get('/', app => {
    app.text('Hello World');
});
```
访问 `localhost:8888` 即可看到文本的输出。

### 配置

```javascript
const varal = require('varal');
const server = new varal({
    port: 80, // 默认值为 8888
    debug: true, // 默认值为 false
    viewPath: 'YourViewPath', // 默认值为 'views'
    routesPath: 'YourRoutesPath', // 默认值为 'routes'
    staticPath: 'YourPublicPath', // 默认值为 'public'
    controllerPath: 'YourControllerPath' // 默认值为 'controllers'
});
```

* port：监听端口
* debug：调试模式，设为 `true` 将在错误页面显示详细信息
* viewPath：视图文件目录，例如入口文件为 `/www/index.js`，默认目录则是 `/www/views/`，下同
* routesPath：路由文件目录，框架会自动加载该目录的所有文件
* staticPath：静态资源目录
* controllerPath：控制器目录


### 路由

直接调用组件的 `get` 与 `post` 方法即可创建路由
```javascript
server.get('/', app =>  {
    app.text('Hello World');
}).name('index');
```
链式调用 `name` 方法为路由命名

#### 带有参数的路由

```javascript
server.get('/user/{id}/info', (app, id) => {
    app.text('User\'s ID is ' + id);
});
```

#### 获取请求数据

```javascript
server.post('/login', app => {
    app.text('Username : ' + app.fields.name);
});
```
请求中的 `URL参数` 与 `表单数据` 都会存放在回调第一个参数的 `fields` 属性中

#### 路由组

```javascript
server.group({prefix: 'group'}, group => {
    group.get('/a', app => {
        // Do something
    });
    group.group({prefix: 'b', middleware: ['auth', 'api']}, group => {
        group.get('/c', app => {
            //Do something
        });
    });
});
```
`group` 方法可以传入一个回调函数，函数中可以定义路由，当传入两个参数时，第一个参数为一个配置对象：

* prefix：路由前缀。上面代码中的两个路由路径分别是 `/group/a` 和 `/group/b/c`
* middleware：中间件数组
* weight：权重，默认100，值低的优先匹配

#### 独立的路由文件

系统会默认加载 `routes` 目录下的所有文件并作为路由处理，路由文件格式示例：

```javascript
exports = module.exports = (server) => {
    server.get('/', 'HomeController@index');
};
```

### 中间件(拦截器)

#### 定义中间件：

```javascript
server.add('auth', (app, next) => {
    const username = app.fields.username;
    const password = app.fields.password;
    // Do auth
    next();
});
```
`add` 函数可以定义中间件，传入两到三个参数，第一个参数为 `中间件命名`，第二个参数为 `回调句柄`，第三个参数为 `权重`，默认100，值低的优先运行，与定义顺序无关
`next` 方法用于将请求传递给下一个中间件或路由，不执行此方法响应将会提前结束

#### 加载全局中间件

```javascript
server.use(['auth', 'api']);
```

#### 为 `路由` 附加中间件

```javascript
server.get('/', app => {
    // Do something
}).use(['auth']);
```

#### 为 `路由组` 附加中间件

```javascript
server.group({middleware: ['auth']}, group => {
    // Some route
});
```

### 使用控制器

```javascript
server.get('/', 'HomeController@index');
```
`controllers/HomeController.js`：
```javascript
exports = module.exports = {
    index(app) {
        app.text('From Controller');
    }
}
```
此例中，控制器文件需要以 `Node Module` 的方式返回带有 `index` 方法的对象。

### 使用视图/模板引擎

```javascript
server.get('/', app => {
    app.render('test', {
        'title': 'Hi!',
        'body': 'This page is rendered by handlebars'
    });
})
```
`views/test.hbs`：
```html
<h1>{{title}}</h1>
<p>{{body}}</p>
```

### 错误处理
程序在任何时候发生错误都会触发 `error` 事件，监听这个事件来处理错误：

```javascript
server.on('error', function (err) {
    console.log(err.stack);
});
```

在 `请求生命周期` 内发生错误时会调用 `请求生命周期` 实例的 `error` 方法，它除了会触发 `error` 事件，还会向客户端输出一个状态码为 `500` 的错误页面，当服务的 `debug` 选项为 `true` 时会显示详细的错误信息

你也可以在定义 `路由` 或 `中间件` 时手动调用 `error` 方法：

```javascript
server.post('user/create', function(app) {
    try {
        // Do Something
    } catch (err) {
        app.error(err);
    }
})
```

### 服务实例

服务实例使用构造方法创建，只有一个可选参数，用于传入配置信息。

#### 属性

* port：监听端口
* debug：调试模式
* viewPath：视图文件路径，默认为 `'views'`
* routesPath：路由文件目录，默认为 `'routes'`
* staticPath：静态文件路径，默认为 `'public'`
* controllerPath：控制器文件路径，默认为 `'controllers'`
* rootPath：进程当前工作的目录
* emitter：`events` 模块 `EventEmitter` 实例

#### 方法

* run()：运行服务
* get(path, callback)：创建一个接收 `GET` 请求的路由，可以链式调用 `name` 方法来命名，以及 `use` 方法来加载中间件
* post(path, callback)：创建一个接收 `POST` 请求的路由，可以链式调用 `name` 方法来命名，以及 `use` 方法来加载中间件
* group([options, ]callback)：创建一个路由组，第一个为可选参数，传入配置选项
* add(name, callback)：定义一个中间件，第一个参数为命名，用于绑定在路由或者路由组上
* use(middleware)：加载全局中间件，参数类型为数组
* on(type, listener)：添加监听事件

#### 可以重新定义的方法

* e404：找不到匹配的路由或静态文件时调用
* e405：查询路由时路径匹配但没有匹配的请求方法时调用
```javascript
server.e404 = app => {
    // Do something
};
server.e405 = app => {
    // Do something
};
```

### 请求生命周期实例

每当请求发生时，都会实例化一个 `app` 对象，它提供的属性和方法可以对该请求进行处理，它经常作为参数出现在本框架的回调中，如 `路由` 与 `中间件`

#### 属性

* req：`request` 对象
* res：`response` 对象，**请尽量使用框架包装的方法，而不是此对象的方法，减少错误的发生**
* resStatus：当前设定的响应状态码，默认为 `200`
* resStatusMessage：当前设定的响应状态信息，默认为空字符串，此时将会根据状态码返回对应的状态信息
* resEndWith：响应处理方式，可能值为 `null`，`route`，`static`
* path：请求路径
* rootPath：进程当前工作的目录
* fields：请求中的参数，包括 `URL` 参数、`application/x-www-form-urlencoded` 表单参数以及 `form-data` 单表参数
* files：请求中上传的文件数组，数组中的对象属性如下：
    + fieldName: 字段名
    + originalFilename: 原文件名
    + path: 临时文件路径
    + headers: 头部信息对象
    + size: 文件大小

#### 方法

* setStatus(status)：设置响应状态码
* setStatusMessage(msg)：设置响应状态信息
* setHeaders(headers)：设置头部信息，参数类型为对象
* setHeader(name, value)：类似 `response` 对象的 `setHeader` 方法
* removeHeader(name)：类似 `response` 对象的 `removeHeader` 方法
* clearHeaders()：清空已设置的头部信息
* initRes()：重置响应内容
* write(data)：类似 `response` 对象的 `write` 方法，但只会暂存数据，并不会立即发送，`text`，`json`，`html` 方法同理
* text(string)：设置头部 `Content-Type: text/plain` 并暂存数据等待发送
* json(object)：设置头部 `Content-Type: application/json` 并暂存数据等待发送，参数需要传入一个对象
* html(data)：设置头部 `Content-Type: text/html` 并暂存数据等待发送
* render(view, object)：使用视图模板设置响应内容
* route(name)：跳转至命名为 `name` 的路由处理
* redirect(url)：返回 `302` 重定向至指定 `URL`
* resEnd(msg)：发送请求数据并终止响应，此方法之后设置的请求数据将不会生效
* resIsEnd()：响应是否已经结束，返回布尔值
* error(err)：抛出错误，参数为 `Error` 实例，重置响应并返回状态码 `500` 和错误页面，当调试模式开启时页面会显示详细错误信息
* emit(type, ...args)：触发事件