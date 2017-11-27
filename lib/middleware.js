'use strict';

const helper = require('./helper');

class Middleware {

    constructor() {
        this.map = [];
        this.globalMiddleware = [];
    }

    add(name, callback, weight) {
        weight = weight || 100;
        for (let i = 0; i < this.map.length; i += 1)
            if (this.map[i].name === name)
                return;
        this.map.push({
            name: name,
            callback: callback,
            weight: weight
        })
    }

    handle(map, app) {
        const next = () => {
            app.next = true;
        };
        this.map.sort(helper.compareWeight);
        for (let i = 0; i < this.map.length; i += 1) {
            if (app.next === false)
                return;
            if (map.indexOf(this.map[i].name) >= 0) {
                app.next = false;
                let callback = this.map[i].callback(app, next);
                if (callback instanceof Promise) {
                    app.asyncStuck += 1;
                    callback.then(() => {
                        app.asyncStuck -= 1;
                        app.resEnd();
                    }).catch(err => {
                        app.error(err);
                    });
                }
            }
        }
    }

    handleGlobal(app) {
        this.handle(this.globalMiddleware, app);
    }

}

exports = module.exports = Middleware;