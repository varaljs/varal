const helper = require('./helper');

class Middleware {

    constructor() {
        this.map = new Map();
        this.globalMiddleware = [];
    }

    add(name, callback, priority) {
        priority = priority || 100;
        callback.priority = priority;
        this.map.set(name, callback);
    }

    handle(map, app) {
        const queue = [];
        for (let name of map)
            if (this.map.has(name))
                queue.push(this.map.get(name));
        queue.sort(helper.comparePriority);
        const iterator = queue[Symbol.iterator]();
        iteratorHandler(app, iterator);
    }

    handleGlobal(app) {
        this.handle(this.globalMiddleware, app);
    }

}

const iteratorHandler = (app, iterator) => {
    let current = iterator.next();
    if (current.done === true) {
        if (app.asyncStuck === 0)
            app.applyRouteResult();
        return;
    }
    const next = () => {
        app.next = true;
        iteratorHandler(app, iterator);
    };
    app.next = false;
    const callback = current.value;
    const res = callback(app, next);
    if (res instanceof Promise) {
        app.asyncStuck += 1;
        res.then(() => {
            app.asyncStuck -= 1;
            app.applyRouteResult();
            app.resEnd();
        }).catch(err => {
            app.error(err);
        });
    }
};

exports = module.exports = Middleware;