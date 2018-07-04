var express = require('express');
var rp = require('request-promise');
var router = express.Router();


/* 将http请求返回的字符串数据转换成json */
function processCatalogBody(body) {

    var data = {
        'AIX': [],
        'ALIAS': [],
        'CLUSTER': [],
        'DATA': [],
        'GDG': [],
        'INDEX': [],
        'NONVSAM': [],
        'PAGESPACE': [],
        'PATH': [],
        'SPACE': [],
        'USERCATALOG': [],
        'TAPELIBRARY': [],
        'TAPEVOLUME': []
    }

    var otherLines = [];

    //对于每一行
    body.split("\n").forEach(line => {
        if (line.startsWith("0")) {
            var tempLine = line.slice(1);// 去掉0

            var re = /[-\s]+/;
            var words = tempLine.split(re).filter(d => d);
            if (words.length != 0 && data.hasOwnProperty(words[0])) {
                data[words[0]].push(words[1])
            } else {
                otherLines.push(line);
            }
        } else {
            otherLines.push(line);
        }
    });

    return {"data": data, "otherLines": otherLines};
}


/*
    *
    * 主目录路由
    * 如:3000/mastercatalog
    * GET方法
    * 以json格式返回主目录数据
    */
router.get("/mastercatalog", function (req, res, next) {
    //构造JCL语句
    var postData = "//ST011PR0 JOB ACCT#,\n" +
        "// NOTIFY=&SYSUID,\n" +
        "// MSGLEVEL=(1,1),LINES=(5,CANCEL),TIME=2\n" +
        "//LSTALIAS EXEC PGM=IDCAMS\n" +
        "//SYSPRINT DD SYSOUT=A\n" +
        "//SYSIN DD *\n" +
        "  LISTCAT CATALOG('CATALOG.MCAT.PLEXY1.PRI')\n"

    //构造http请求对象
    var options = {
        url: 'https://10.60.45.8:8800/zosmf/restjobs/jobs',
        method: 'PUT',
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
        },
        body: postData
    };

    //调用request-promise对象实现http请求嵌套
    //提交作业
    rp(options, function (error) {
        if (error) {
            return console.error("An error occurred", error);
        }
    }).then(resource => {
        // console.log(resource);

        //根据之前http请求返回构造新的请求对象
        var str = JSON.parse(resource);
        var jobname = str.jobname;
        var jobid = str.jobid;

        //构造url获取作业输出列表
        var url = "https://10.60.45.8:8800/zosmf/restjobs/jobs/" + jobname + "/" + jobid + "/files";

        var options = {
            url: url,
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
            },
        };

        return rp(options, function (error) {
            if (error) {
                return console.error("An error occurred", error);
            }
        })
    }).then(resource => {
        var str = JSON.parse(resource);
        var jobname = str[0].jobname;
        var jobid = str[0].jobid;
        var id;
        //根据获取作业输出表列中ddname对应的id号
        for (var i = 0; i < str.length; i++) {
            if (str[i].ddname == "SYSPRINT") {
                id = str[i].id;
            }
        }

        //构造url用get方法获取作业输出
        var url = "https://10.60.45.8:8800/zosmf/restjobs/jobs/" + jobname + "/" + jobid + "/files/" + id + "/records";
        // var url = "https://10.60.45.8:8800/zosmf/restjobs/jobs/ST011PR0/JOB03150/files/102/records";
        var options = {
            url: url,
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/plain',
                'Cache-Control': 'no-cache',
                'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
            },
        };

        //设置延迟函数
        setTimeout(function () {
            // console.log("wait!");
            rp(options, function (error, response, body) {
                if (error) {
                    return console.error("An error occurred", error);
                }
                else {
                    console.log(body);
                    //输出内容转json
                    var data = processCatalogBody(body);
                    //数据返回前端
                    res.send(data);
                }
            })
        }, 1000);
    })
});


/*
    *
    *用户目录路由
    * 如:3000/usercatalog & 3000/usercatalog?name=ST033
    * GET方法
    * 以json格式返回用户目录数据
    */
router.get("/usercatalog", function (req, res, next) {
    //构造初始jcl语句
    var postData = "//ST011PR0 JOB ACCT#,\n" +
        "// NOTIFY=&SYSUID,\n" +
        "// MSGLEVEL=(1,1),LINES=(5,CANCEL),TIME=2\n" +
        "//LSTALIAS EXEC PGM=IDCAMS\n" +
        "//SYSPRINT DD SYSOUT=A\n" +
        "//SYSIN DD *\n";

    //判断前端调用查询类型
    //name值为空时默认查询主目录下的用户目录表列
    var catalogName = req.query.name;
    if (catalogName != undefined) {
        postData += "  LISTCAT CATALOG('" + catalogName.toUpperCase() + "')\n";
        // console.log(postData);
    }
    else {
        postData += "  LISTCAT CATALOG('CATALOG.MCAT.PLEXY1.PRI') USERCATALOG\n";
    }

    var options = {
        url: 'https://10.60.45.8:8800/zosmf/restjobs/jobs',
        method: 'PUT',
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
        },
        body: postData
    };

    rp(options, function (error) {
        if (error) {
            return console.error("An error occurred", error);
        }
    }).then(resource => {
        // console.log(resource);
        var str = JSON.parse(resource);
        var jobname = str.jobname;
        var jobid = str.jobid;
        var url = "https://10.60.45.8:8800/zosmf/restjobs/jobs/" + jobname + "/" + jobid + "/files";
        var options = {
            url: url,
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
            },
        };
        return rp(options, function (error) {
            if (error) {
                return console.error("An error occurred", error);
            }
        })
    }).then(resource => {
        var str = JSON.parse(resource);
        var jobname = str[0].jobname;
        var jobid = str[0].jobid;
        var id;
        for (var i = 0; i < str.length; i++) {
            if (str[i].ddname == "SYSPRINT") {
                id = str[i].id;
            }
        }
        var url = "https://10.60.45.8:8800/zosmf/restjobs/jobs/" + jobname + "/" + jobid + "/files/" + id + "/records";
        var options = {
            url: url,
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
            },
        };
        return rp(options, function (error) {
            if (error) {
                return console.error("An error occurred", error);
            }
        })
    }).then(resource => {
        //字符串处理
        var data = processCatalogBody(resource);
        res.send(data);
    })
});


/*
    *
    * 获取alias目录路由
    * 如:3000/alias & 3000/alias?name=ST033
    * GET方法
    * 以json格式返回alias目录数据
    */
router.get("/alias", function (req, res, next) {
    //构造jcl语句
    var postData = "//ST011PR0 JOB ACCT#,\n" +
        "// NOTIFY=&SYSUID,\n" +
        "// MSGLEVEL=(1,1),LINES=(5,CANCEL),TIME=2\n" +
        "//LSTALIAS EXEC PGM=IDCAMS\n" +
        "//SYSPRINT DD SYSOUT=A\n" +
        "//SYSIN DD *\n";

    //判断前端调用查询类型
    //name值为空时默认查询主目录下的ALIAS表列
    var aliasName = req.query.name;
    if (aliasName != undefined) {
        postData += "  LISTCAT CATALOG('" + aliasName.toUpperCase() + "')\n";
        console.log(postData);
    }
    else {
        postData += "  LISTCAT CATALOG('CATALOG.MCAT.PLEXY1.PRI') ALIAS\n";
    }
    //构造提交作业请求
    var options = {
        url: 'https://10.60.45.8:8800/zosmf/restjobs/jobs',
        method: 'PUT',
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
        },
        body: postData
    };
    console.log(postData);
    rp(options, function (error) {
        if (error) {
            return console.error("An error occurred", error);
        }
    }).then(resource => {
        // console.log(resource);
        var str = JSON.parse(resource);
        var jobname = str.jobname;
        var jobid = str.jobid;
        var url = "https://10.60.45.8:8800/zosmf/restjobs/jobs/" + jobname + "/" + jobid + "/files";

        //构造获取作业输出列表请求
        var options = {
            url: url,
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
            },
        };
        return rp(options, function (error) {
            if (error) {
                return console.error("An error occurred", error);
            }
        })
    }).then(resource => {
        var str = JSON.parse(resource);
        var jobname = str[0].jobname;
        var jobid = str[0].jobid;
        var id;
        for (var i = 0; i < str.length; i++) {
            if (str[i].ddname == "SYSPRINT") {
                id = str[i].id;
            }
        }
        var url = "https://10.60.45.8:8800/zosmf/restjobs/jobs/" + jobname + "/" + jobid + "/files/" + id + "/records";

        //构造获取作业输出请求
        var options = {
            url: url,
            method: 'GET',
            rejectUnauthorized: false,
            headers: {
                'Content-Type': 'text/plain',
                'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
            },
        };
        return rp(options, function (error) {
            if (error) {
                return console.error("An error occurred", error);
            }
        })
    }).then(resource => {
        //字符串处理
        var data = processCatalogBody(resource);
        res.send(data);
    })

});


/*
    *
    * 获取某个alias列表的路由
    * 如:3000/alias/list?name=ST033
    * GET方法
    * 以json格式返回数据集内容列表
    */
router.get("/alias/list", function (req, res, next) {
    var url = "https://10.60.45.8:8800/zosmf/restfiles/ds?dslevel="

    //构造url
    var aliasName = req.query.name;
    url += aliasName.toUpperCase();

    var options = {
        url: url,
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
        },
    };

    rp(options, function (error) {
        if (error) {
            return console.error("An error occurred", error);
        }
    }).then(resource => {
            var data = JSON.parse(resource);
            res.send(data);
        }
    )
})


/*
    *
    * 获取具体数据集内容的路由
    * 如：3000/ds/detail?name=st007.PDSTEST(test1) & :3000/ds/detail?name=st007.testdata
    * GET方法
    * 当数据集为顺序数据集时，返回数据集内容（String）
    * 当数据集为分区数据集时，以json格式返回其子集
    * 当数据集为无法打开的数据集时，返回错误
    */
router.get("/ds/detail", function (req, res, next) {
    var url = "https://10.60.45.8:8800/zosmf/restfiles/ds/"
    var dsName = req.query.name;
    url += dsName.toUpperCase();
    url += "/member"
    console.log(url);

    var options = {
        url: url,
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
        },
    };
    rp(options, function (error) {
        if (error) {
            return console.error("An error occurred", error);
        }
    }).then(resource => {
        console.log(resource);
        var data = JSON.parse(resource);
        res.send(data);
    }).catch(err => {
        console.log(err.error);
        next();
    })
}, function (req, res, next) {
    var url = "https://10.60.45.8:8800/zosmf/restfiles/ds/"
    var dsName = req.query.name;
    url += dsName.toUpperCase();

    var options = {
        url: url,
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
            'Content-Type': 'text/plain',
            'Authorization': 'Basic aWJtdXNlcjoyMDE4MDY='
        }
    };
    rp(options, function (error) {
        if (error) {
            return console.error("An error occurred", error);
        }
    }).then(resource => {
        console.log(resource.toString());
        // var data = JSON.parse(resource);
        res.send(resource);
    }).catch(err => {
        console.log(err.error);
        next();
    })
}, function (req, res) {
    var errorInfo = {error: "This is not a dataset!"};
    res.send(errorInfo);
});


module.exports = router;
