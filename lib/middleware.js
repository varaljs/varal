'use strict';

const helper = require('./helper');

class Middleware {
    constructor() {
        this.map = [];
    }

    add(name, callback, weight) {
        weight = weight || 100;
        for (let i = 0; i < this.map.length; i += 1) {
            if (this.map[i].name === name) {
                return;
            }
        }
        this.map.push({
            name: name,
            callback: callback,
            weight: weight
        })
    }

    handle(map, app) {
        let next = function () {
            app.next = true;
        };
        this.map.sort(helper.compareWeight);
        for (let i = 0; i < this.map.length; i += 1) {
            if (app.next === false)
                return;
            if (map.indexOf(this.map[i].name) >= 0) {
                app.next = false;
                this.map[i].callback(app, next);
            }
        }
    }
}

exports = module.exports = Middleware;