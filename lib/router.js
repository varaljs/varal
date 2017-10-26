'use strict';

let Router = {
    createNew: function (app) {
        let router = {};
        router.add = function (method, path, callback) {
            for (let i = 0; i < app.routesMap.length; i += 1) {
                if (app.routesMap[i].path === path) {
                    app.routesMap.splice(i, 1);
                }
            }
            app.routesMap.push({
                method: method,
                path: path,
                callback: callback
            })
        };
        return router;
    }
};

exports = module.exports = Router;