'use strict';

let Router = {
    createNew: function (app) {
        let router = {};
        router.add = function (method, path, callback) {
            for (let i = 0; i < app.routes_map.length; i += 1) {
                if (app.routes_map[i].path === path) {
                    app.routes_map.splice(i, 1);
                }
            }
            app.routes_map.push({
                method: method,
                path: path,
                callback: callback
            })
        };
        return router;
    }
};

exports = module.exports = Router;