var express = require('express');
var rp = require('request-promise');
var router = express.Router();


//将http请求返回的字符串转换为json
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

// function processDSBody(body){
//     var
// }


/* GET home page. */
router.get('/', function* (next) {
    res.render('index', {title: 'Express'});
});
// router.get('/mastercatalog', function (req, res, next) {
//     res.send('Hello World!');
// });


/*
    *
    *主目录路由
    *
    */
router.get("/mastercatalog", function (req, res, next) {
    var postData = "//ST011PR0 JOB ACCT#,\n" +
        "// NOTIFY=&SYSUID,\n" +
        "// MSGLEVEL=(1,1),LINES=(5,CANCEL),TIME=2\n" +
        "//LSTALIAS EXEC PGM=IDCAMS\n" +
        "//SYSPRINT DD SYSOUT=A\n" +
        "//SYSIN DD *\n" +
        "  LISTCAT CATALOG('CATALOG.MCAT.PLEXY1.PRI')\n"

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
        data.name = "mastercatalog";
        console.log(data);
        res.send(data);
    })
});


/*
    *
    *用户目录路由
    *
    */
router.get("/usercatalog", function (req, res, next) {
    var postData = "//ST011PR0 JOB ACCT#,\n" +
        "// NOTIFY=&SYSUID,\n" +
        "// MSGLEVEL=(1,1),LINES=(5,CANCEL),TIME=2\n" +
        "//LSTALIAS EXEC PGM=IDCAMS\n" +
        "//SYSPRINT DD SYSOUT=A\n" +
        "//SYSIN DD *\n";

    var catalogName = req.query.name;
    if (catalogName != undefined) {
        postData += "  LISTCAT CATALOG('" + catalogName.toUpperCase() + "')\n";
        console.log(postData);
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
    *alias目录路由
    *
    */
router.get("/alias", function (req, res, next) {
    var postData = "//ST011PR0 JOB ACCT#,\n" +
        "// NOTIFY=&SYSUID,\n" +
        "// MSGLEVEL=(1,1),LINES=(5,CANCEL),TIME=2\n" +
        "//LSTALIAS EXEC PGM=IDCAMS\n" +
        "//SYSPRINT DD SYSOUT=A\n" +
        "//SYSIN DD *\n";

    var aliasName = req.query.name;
    if (aliasName != undefined) {
        postData += "  LISTCAT CATALOG('" + aliasName.toUpperCase() + "')\n";
        console.log(postData);
    }
    else {
        postData += "  LISTCAT CATALOG('CATALOG.MCAT.PLEXY1.PRI') ALIAS\n";
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
    *某个alias列表
    *
    */
router.get("/alias/list", function (req, res, next) {
    var url = "https://10.60.45.8:8800/zosmf/restfiles/ds?dslevel="
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

//
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
}, function(req, res){
    var errorInfo = {error: "This is not a dataset!"};
    res.send(errorInfo);
});



    router.post("/search", function (req, res, next) {
        var postData = "//ST011PR0 JOB ACCT#,\n" +
            "// NOTIFY=&SYSUID,\n" +
            "// MSGLEVEL=(1,1),LINES=(5,CANCEL),TIME=2\n" +
            "//LSTALIAS EXEC PGM=IDCAMS\n" +
            "//SYSPRINT DD SYSOUT=A\n" +
            "//SYSIN DD *\n";
        if (req.body.name == "") {
            postData += "";
        }
        else if (req.body.name == "") {

        }

    })

    module.exports = router;
