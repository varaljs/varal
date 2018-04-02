class Helper {

    static date(format) {
        format = format || 'Y-m-d H:i:s';
        const date = new Date();
        let t;
        format = format.replace('Y', date.getFullYear());
        format = format.replace('y', (date.getFullYear() + '').slice(2));
        format = format.replace('m', (t = date.getMonth() + 1) < 10 ? '0' + t : t);
        format = format.replace('d', (t = date.getDate()) < 10 ? '0' + t : t);
        format = format.replace('H', (t = date.getHours()) < 10 ? '0' + t : t);
        format = format.replace('h', (t = (t = date.getHours()) > 11 ? t - 12 : t) < 10 ? '0' + t : t);
        format = format.replace('i', (t = date.getMinutes()) < 10 ? '0' + t : t);
        format = format.replace('s', (t = date.getSeconds()) < 10 ? '0' + t : t);
        return format;
    }

    static pathFormat(path) {
        if (!path || path === '/')
            return '';
        path = formatPathFront(path);
        path = formatPathEnd(path);
        return path;
    }

    static comparePriority(a, b) {
        if (a.priority < b.priority) {
            return -1;
        } else if (a.priority > b.priority) {
            return 1;
        } else {
            return 0;
        }
    }

    static arrayMerge(a, b) {
        for (let i = 0; i < b.length; i += 1)
            if (a.indexOf(b[i]) < 0)
                a.push(b[i]);
        return a;
    }

    /**
     * 检测路由路径是否匹配，并返回路由参数（如果有）
     * @param {string} path1 路由路径
     * @param {string} path2 请求路径
     * @returns {boolean,Array}
     */
    static pathMatch(path1, path2) {
        if (path1 === path2)
            return [];
        let params = path1.match(/{[^{}]*}/g);
        if (params)
            return parseParams(path1, path2, params);
        return false;
    }

}

const formatPathFront = path => {
    if (path.substr(0, 1) !== '/') {
        path = '/' + path;
        return path;
    } else if (path.substr(1, 1) === '/') {
        path = path.substr(1);
        return formatPathFront(path);
    } else
        return path;
};

const formatPathEnd = path => {
    if (path.substr(-1, 1) === '/')
        path = path.substr(0, path.length - 1);
    if (path.substr(-1, 1) === '/')
        return formatPathEnd(path);
    else
        return path;
};

const parseParams = (path1, path2, params) => {
    const args = [];
    for (let i = 0; i < params.length; i += 1) {
        const prePos = path1.indexOf(params[i]);
        if (path1.substr(0, prePos - 1) === path2.substr(0, prePos - 1)) {
            path1 = path1.substr(prePos + params[i].length);
            path2 = path2.substr(prePos);
            if (path2 === '')
                return false;
            const slashPos = path2.indexOf('/');
            if (slashPos < 0) {
                args.push(path2);
                path2 = '';
            }
            else {
                args.push(path2.substr(0, slashPos));
                path2 = path2.substr(slashPos);
            }
        } else
            return false;
    }
    if (path1 === path2)
        return args;
};

exports = module.exports = Helper;