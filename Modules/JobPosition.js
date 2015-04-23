var JobPosition = function (models) {
    var mongoose = require('mongoose');
    var objectId = mongoose.Types.ObjectId;
    var logWriter = require('../helpers/logWriter');
    var employee = mongoose.Schemas['Employee'];
    var department = mongoose.Schemas['Department'];

    var jobPositionSchema = mongoose.Schemas['JobPosition'];

    function getTotalCount (req, response) {
        var res = {};
        var data = {};
        for (var i in req.query) {
            data[i] = req.query[i];
        }

        models.get(req.session.lastDb, "Department", department).aggregate(
            {
                $match: {
                    users: objectId(req.session.uId)
                }
            }, {
                $project: {
                    _id: 1
                }
            },
            function (err, deps) {
                if (!err) {
                    var arrOfObjectId = deps.objectID();
                    models.get(req.session.lastDb, 'JobPosition', jobPositionSchema).aggregate(
                        {
                            $match: {
                                $and: [
                                    {},
                                    {
                                        $or: [
                                            {
                                                $or: [
                                                    {
                                                        $and: [
                                                            {whoCanRW: 'group'},
                                                            {'groups.users': objectId(req.session.uId)}
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            {whoCanRW: 'group'},
                                                            {'groups.group': {$in: arrOfObjectId}}
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                $and: [
                                                    {whoCanRW: 'owner'},
                                                    {'groups.owner': objectId(req.session.uId)}
                                                ]
                                            },
                                            {whoCanRW: "everyOne"}
                                        ]
                                    }
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 1
                            }
                        },
                        function (err, result) {
                            if (!err) {
                                res['count'] = result.length;
                                response.send(res);
                            } else {
                                logWriter.log("JobPosition.js getTotalCount JobPositions.find " + err);
                                response.send(500, {error: "Can't find JobPositions"});
                            }
                        });
                } else {
                    console.log(err);
                }
            });
    };

    function create (req, data, res) {
        try {
            if (!data) {
                logWriter.log('JobPosition.create Incorrect Incoming Data');
                res.send(400, {error: 'JobPosition.create Incorrect Incoming Data'});
                return;
            } else {
                var query = {name: data.name};
                models.get(req.session.lastDb, 'JobPosition', jobPositionSchema).find(query, function (error, doc) {
                    if (error) {
                        console.log(error);
                        logWriter.log('JobPosition.js. create job.find' + error);
                        res.send(500, {error: 'JobPosition.create find error'});
                    }
                    if (doc.length > 0) {
                        if (doc[0].name === data.name) {
                            res.send(400, {error: 'An jobPosition with the same Name already exists'});
                        }
                    } else if (doc.length === 0) {
                        savetoDb(data);
                    }
                });
            }
            function savetoDb (data) {
                try {
                    _job = new models.get(req.session.lastDb, 'JobPosition', jobPositionSchema)();
                    if (data.uId) {
                        _job.createdBy.user = data.uId;
                        //uId for edited by field on creation
                        _job.editedBy.user = data.uId;
                    }
                    if (data.name) {
                        _job.name = data.name;
                    }
                    if (data.expectedRecruitment) {
                        _job.expectedRecruitment = data.expectedRecruitment;
                    }
                    if (data.interviewForm) {
                        if (data.interviewForm._id) {
                            _job.interviewForm.id = data.interviewForm._id;
                        }
                        if (data.interviewForm.name) {
                            _job.interviewForm.name = data.interviewForm.name;
                        }
                    }
                    if (data.department) {
                        _job.department = data.department;
                    }
                    if (data.description) {
                        _job.description = data.description;
                    }
                    if (data.requirements) {
                        _job.requirements = data.requirements;
                    }
                    if (data.workflow) {
                        _job.workflow = data.workflow;
                    }
                    if (data.groups) {
                        _job.groups = data.groups;
                    }
                    if (data.whoCanRW) {
                        _job.whoCanRW = data.whoCanRW;
                    }
                    _job.save(function (err, result) {
                        if (err) {
                            console.log(err);
                            logWriter.log("JobPosition.js create savetoDB _job.save " + err);
                            res.send(500, {error: 'JobPosition.save BD error'});
                        } else {
                            res.send(201, {success: {massage: 'A new JobPosition create success', id: result._id}});
                        }
                    });
                }
                catch (error) {
                    console.log(error);
                    logWriter.log("JobPosition.js create savetoDB " + error);
                    res.send(500, {error: 'JobPosition.save  error'});
                }
            }
        }
        catch (exception) {
            console.log(exception);
            logWriter.log("JobPosition.js  " + exception);
            res.send(500, {error: 'JobPosition.save  error'});
        }
    };//End create

    function getJobPositionById (req, id, res) {
        var query = models.get(req.session.lastDb, 'JobPosition', jobPositionSchema).findById(id);
        query.populate("department", "departmentName _id");
        query.populate("workflow", "name _id").
            populate('createdBy.user').
            populate('editedBy.user').
            populate('groups.users').
            populate('groups.group').
            populate('groups.owner', '_id login');

        query.exec(function (err, response) {
            if (err) {
                console.log(err);
                logWriter.log('JobPosition.js get job.find' + err);
                res.send(500, {error: "Can't find JobPosition"});
            } else {
                var aggregate = models.get(req.session.lastDb, 'Employees', employee).aggregate(
                    {
                        $match: {
                            jobPosition: objectId(id)
                        }
                    },
                    function (err, result) {
                        if (err) {
                            logWriter.log('JobPosition.js getJobPositionById aggregate ' + err);
                            res.send(500, {error: "Cant't find an JobPosition"});
                        } else {
                            response.numberOfEmployees = result.length;
                            response.totalForecastedEmployees = response.expectedRecruitment + result.length;
                            res.send(response);
                        }
                    }
                );
            }
        });
    }

    function getJobPositionForDd (req, response) {
        var res = {};
        res['data'] = [];
        var query = models.get(req.session.lastDb, 'JobPosition', jobPositionSchema).find({});
        query.select('_id name');
        query.exec(function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log('JobPosition.js get job.find' + err);
                response.send(500, {error: "Can't find JobPosition"});
            } else {
                res['data'] = result;
                response.send(res);
            }
        });
    };

    function get (req, response) {
        var res = {};
        res['data'] = [];
        var query = models.get(req.session.lastDb, 'JobPosition', jobPositionSchema).find({});
        query.populate('department').
            populate('createdBy.user').
            populate('editedBy.user').
            populate('workflow', 'name _id');
        query.sort({name: 1});
        query.exec(function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log('JobPosition.js get job.find' + err);
                response.send(500, {error: "Can't find JobPosition"});
            } else {
                res['data'] = result;
                response.send(res);
            }
        });
    }; //end get


    function getFilter (req, response) {
        var res = {};
        res['data'] = [];

        var data = {};
        for (var i in req.query) {
            data[i] = req.query[i];
        }

        models.get(req.session.lastDb, "Department", department).aggregate(
            {
                $match: {
                    users: objectId(req.session.uId)
                }
            }, {
                $project: {
                    _id: 1
                }
            },
            function (err, deps) {
                if (!err) {
                    var arrOfObjectId = deps.objectID();
                    models.get(req.session.lastDb, "JobPosition", jobPositionSchema).aggregate(
                        {
                            $match: {
                                $or: [
                                    {
                                        $or: [
                                            {
                                                $and: [
                                                    {whoCanRW: 'group'},
                                                    {'groups.users': objectId(req.session.uId)}
                                                ]
                                            },
                                            {
                                                $and: [
                                                    {whoCanRW: 'group'},
                                                    {'groups.group': {$in: arrOfObjectId}}
                                                ]
                                            }
                                        ]
                                    },
                                    {
                                        $and: [
                                            {whoCanRW: 'owner'},
                                            {'groups.owner': objectId(req.session.uId)}
                                        ]
                                    },
                                    {whoCanRW: "everyOne"}
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 1
                            }
                        },
                        function (err, result) {
                            if (!err) {
                                var query = models.get(req.session.lastDb, "JobPosition", jobPositionSchema).find().where('_id').in(result);
                                if (data.sort && (!data.sort.totalForecastedEmployees && !data.sort.numberOfEmployees)) {
                                    query.sort(data.sort);
                                } else {
                                    query.sort({"editedBy.date": -1});
                                }
                                query.select("_id createdBy editedBy name department totalForecastedEmployees numberOfEmployees expectedRecruitment workflow").
                                    populate('createdBy.user', 'login').
                                    populate('editedBy.user', 'login').
                                    populate('department', 'departmentName').
                                    populate('workflow', 'name _id status').
                                    skip((data.page - 1) * data.count).
                                    limit(data.count).
                                    exec(function (error, _res) {

                                        if (!error) {
                                            res['data'] = _res;
                                            if (_res.length !== 0) {
                                                _res.forEach(function (ellement, index) {
                                                    models.get(req.session.lastDb, 'Employees', employee).find({jobPosition: ellement._id}).count(function (err, count) {
                                                        if (count) {
                                                            ellement.numberOfEmployees = count;
                                                            ellement.totalForecastedEmployees = ellement.numberOfEmployees + ellement.expectedRecruitment;
                                                        } else if (err) {
                                                            console.log(err);
                                                            response.send(500, {error: 'Some error occured in JobPosition'});
                                                        }
                                                        if (index == data.count - 1 || ((_res.length < data.count) && (index == _res.length - 1))) {


                                                            if (data.sort && (data.sort.totalForecastedEmployees || data.sort.numberOfEmployees)) {
                                                                for (var i in data.sort) {
                                                                    switch (i) {
                                                                        case 'totalForecastedEmployees':
                                                                        {
                                                                            res['data'].sort(function (a, b) {
                                                                                if (+data.sort[i] === 1) {
                                                                                    if (a.totalForecastedEmployees > b.totalForecastedEmployees)
                                                                                        return 1;
                                                                                    if (a.totalForecastedEmployees < b.totalForecastedEmployees)
                                                                                        return -1;
                                                                                    return 0;
                                                                                } else {
                                                                                    if (a.totalForecastedEmployees < b.totalForecastedEmployees)
                                                                                        return 1;
                                                                                    if (a.totalForecastedEmployees > b.totalForecastedEmployees)
                                                                                        return -1;
                                                                                    return 0;
                                                                                }
                                                                            });
                                                                        }
                                                                            ;
                                                                            break;
                                                                        case 'numberOfEmployees':
                                                                        {
                                                                            res['data'].sort(function (a, b) {
                                                                                if (+data.sort[i] === 1) {
                                                                                    if (a.numberOfEmployees > b.numberOfEmployees)
                                                                                        return 1;
                                                                                    if (a.numberOfEmployees < b.numberOfEmployees)
                                                                                        return -1;
                                                                                    return 0;
                                                                                } else {
                                                                                    if (a.numberOfEmployees < b.numberOfEmployees)
                                                                                        return 1;
                                                                                    if (a.numberOfEmployees > b.numberOfEmployees)
                                                                                        return -1;
                                                                                    return 0;
                                                                                }
                                                                            });
                                                                        }
                                                                            ;
                                                                            break;
                                                                    }
                                                                }

                                                            }
                                                            response.send(res);
                                                        }
                                                    });
                                                });
                                            } else {
                                                response.send(res);
                                            }
                                        } else {
                                            console.log(error);
                                            response.send(500, {error: 'Some error occured in JobPosition'});
                                        }
                                    });
                            } else {
                                console.log(err);
                                response.send(500, {error: 'Some error occured in JobPosition'});
                            }
                        }
                    );
                } else {
                    console.log(err);
                    response.send(500, {error: 'Some error occured in JobPosition'});
                }
            });
    }

    function update (req, _id, data, res) {
        try {
            delete data._id;
            delete data.createdBy;
            if (data.workflow === '528ce71ef3f67bc40b00001d') {
                ++data.expectedRecruitment;
            } else {
                if (data.workflow && data.expectedRecruitment !== 0)
                    --data.expectedRecruitment;
            }
            data.numberOfEmployees = data.numberOfEmployees || 0;
            data.totalForecastedEmployees = data.expectedRecruitment + data.numberOfEmployees;
            if (data.department && data.department._id) {
                data.department = data.department._id;
            }
            if (data.workflow && data.workflow._id) {
                data.workflow = data.workflow._id;
            }
            models.get(req.session.lastDb, 'JobPosition', jobPositionSchema).update({_id: _id}, data, function (err, result) {
                if (err) {
                    console.log(err);
                    logWriter.log("JobPosition.js update job.update " + err);
                    res.send(500, {error: "Can't update JobPosition"});
                } else {
                    res.send(200, {success: 'JobPosition updated success'});
                }
            });
        }
        catch (exception) {
            console.log(exception);
            logWriter.log("JobPosition.js update " + exception);
            res.send(500, {error: 'JobPosition updated error'});
        }
    };// end update

    function remove (req, _id, res) {
        models.get(req.session.lastDb, 'JobPosition', jobPositionSchema).remove({_id: _id}, function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log("JobPosition.js remove job.remove " + err);
                res.send(500, {error: "Can't remove JobPosition"});
            } else {
                res.send(200, {success: 'JobPosition removed'});
            }
        });
    };// end remove

    return {
        getTotalCount: getTotalCount,

        getJobPositionById: getJobPositionById,


        create: create,

        get: get,

        getFilter: getFilter,

        update: update,

        remove: remove,

        getJobPositionForDd: getJobPositionForDd
    };
};

module.exports = JobPosition;
