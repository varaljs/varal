'use strict';

class Helper {
    static pathFormat(path) {
        if (path === '/')
            return path;
        if (path.substr(0, 1) !== '/')
            path = '/' + path;
        if (path.substr(-1, 1) === '/')
            path = path.substr(0, path.length - 1);
        return path;
    }

    static compareWeight(a, b) {
        if (a.weight < b.weight) {
            return -1;
        } else if (a.weight > b.weight) {
            return 1;
        } else {
            return 0;
        }
    }

    static array_merge(a, b) {
        for (let i = 0; i < b.length; i += 1)
            if (a.indexOf(b[i]) < 0)
                a.push(b[i]);
        return a;
    }

    /**
     * 检测路由路径是否匹配，并返回路由参数（如果有）
     * @param {string} path1 定义路径
     * @param {string} path2 请求路径
     * @returns {boolean,Array}
     */
    static pathMatch(path1, path2) {
        if (path1 === path2)
            return [];
        const reg = /{[^{}]*}/g;
        let params, i;
        let args = [];
        if (params = path1.match(reg)) {
            for (i = 0; i < params.length; i += 1) {
                let prePos = path1.indexOf(params[i]);
                if (path1.substr(0, prePos - 1) === path2.substr(0, prePos - 1)) {
                    path1 = path1.substr(prePos + params[i].length);
                    path2 = path2.substr(prePos);
                    if (path2 === '')
                        return false;
                    let slashPos = path2.indexOf('/');
                    if (slashPos < 0) {
                        args.push(path2);
                        path2 = '';
                    }
                    else {
                        args.push(path2.substr(0, slashPos));
                        path2 = path2.substr(slashPos);
                    }
                } else
                    return false
            }
            if (path1 === path2)
                return args;
            return false;
        } else
            return false;
    }
}

exports = module.exports = Helper;