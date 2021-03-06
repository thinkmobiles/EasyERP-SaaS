// JavaScript source code
var Employee = function (event, models) {
    var mongoose = require('mongoose');
    var logWriter = require('../helpers/logWriter.js')();
    var department = mongoose.Schemas['Department'];
    var objectId = mongoose.Types.ObjectId;
    var employeeSchema = mongoose.Schemas['Employee'];
    var fs = require('fs');

    function getTotalCount(req, response) {
        var res = {};
        var data = {};
        for (var i in req.query) {
            data[i] = req.query[i];
        }
        res['showMore'] = false;

        var contentType = req.params.contentType;
        var optionsObject = {};
        if (data.filter.letter)
            optionsObject['name.last'] = new RegExp('^[' + data.filter.letter.toLowerCase() + data.filter.letter.toUpperCase() + '].*');


        if (data.filter && data.filter.workflow) {
            data.filter.workflow = data.filter.workflow.map(function (item) {
                return item === "null" ? null : item;
            });
            optionsObject['workflow'] = { $in: data.filter.workflow.objectID() };
        } else if (data && !data.newCollection) {
            optionsObject['workflow'] = { $in: [] };
        }

        switch (contentType) {
            case ('Employees'): {
                optionsObject['isEmployee'] = true;
            }
                break;
            case ('Applications'): {
                optionsObject['isEmployee'] = false;
            }
                break;
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
                    models.get(req.session.lastDb, "Employees", employeeSchema).aggregate(
                        {
                            $match: {
                                $and: [
                                    optionsObject,
                                    {
                                        $or: [
                                            {
                                                $or: [
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.users': objectId(req.session.uId) }
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.group': { $in: arrOfObjectId } }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                $and: [
                                                    { whoCanRW: 'owner' },
                                                    { 'groups.owner': objectId(req.session.uId) }
                                                ]
                                            },
                                            { whoCanRW: "everyOne" }
                                        ]
                                    }
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 1
                            }
                        }
                        ,
                        function (err, result) {
                            if (!err) {
                                if (data.currentNumber && data.currentNumber < result.length) {
                                    res['showMore'] = true;
                                }
                                res['count'] = result.length;
                                response.send(res);
                            } else {
                                console.log(err);
                                logWriter.log("Employees.js getTotalCount " + err);
                                response.send(500, { error: 'Server Eroor' });
                            }
                        }
                    );

                } else {
                    console.log(err);
                    logWriter.log("Employees.js getTotalCount " + err);
                    response.send(500, { error: 'Server Eroor' });
                }
            });
    };

    function getAge(birthday) {
        birthday = new Date(birthday);
        var today = new Date();
        var years = today.getFullYear() - birthday.getFullYear();

        birthday.setFullYear(today.getFullYear());

        if (today < birthday) {
            years--;
        }
        return (years < 0) ? 0 : years;
    };

    function getDate(date) {
        var _date = new Date(date);
        var currentTimeZoneOffsetInMiliseconds = -_date.getTimezoneOffset() * 60 * 1000;
        var valaueOf_date = _date.valueOf();
        valaueOf_date += currentTimeZoneOffsetInMiliseconds;
        return new Date(valaueOf_date);
    };

    function create(req, data, res) {
        try {
            if (!data) {
                logWriter.log('Employees.create Incorrect Incoming Data');
                res.send(400, { error: 'Employees.create Incorrect Incoming Data' });
                return;
            } else {
                savetoDb(data);
            }

            function savetoDb(data) {
                _employee = new models.get(req.session.lastDb, "Employees", employeeSchema)();
                if (data.uId) {
                    _employee.createdBy.user = data.uId;
                    //uId for edited by field on creation
                    _employee.editedBy.user = data.uId;
                }
                if (data.isEmployee) {
                    _employee.isEmployee = data.isEmployee;
                }
                if (data.name) {
                    if (data.name.first) {
                        _employee.name.first = data.name.first;
                    }
                    if (data.name.last) {
                        _employee.name.last = data.name.last;
                    }
                }
                if (data.gender) {
                    _employee.gender = data.gender;
                }
                if (data.marital) {
                    _employee.marital = data.marital;
                }
                if (data.subject) {
                    _employee.subject = data.subject;
                }
                if (data.tags) {
                    _employee.tags = data.tags;
                }
                if (data.workAddress) {
                    if (data.workAddress.street) {
                        _employee.workAddress.street = data.workAddress.street;
                    }
                    if (data.workAddress.city) {
                        _employee.workAddress.city = data.workAddress.city;
                    }
                    if (data.workAddress.state) {
                        _employee.workAddress.state = data.workAddress.state;
                    }
                    if (data.workAddress.zip) {
                        _employee.workAddress.zip = data.workAddress.zip;
                    }
                    if (data.workAddress.country) {
                        _employee.workAddress.country = data.workAddress.country;
                    }
                }
                if (data.workEmail) {
                    _employee.workEmail = data.workEmail;
                }
                if (data.personalEmail) {
                    _employee.personalEmail = data.personalEmail;
                }
                if (data.skype) {
                    _employee.skype = data.skype;
                }
                if (data.workPhones) {
                    if (data.workPhones.phone) {
                        _employee.workPhones.phone = data.workPhones.phone;
                    }
                    if (data.workPhones.mobile) {
                        _employee.workPhones.mobile = data.workPhones.mobile;
                    }
                }
                if (data.officeLocation) {
                    _employee.officeLocation = data.officeLocation;
                }
                if (data.relatedUser) {
                    _employee.relatedUser = data.relatedUser;
                }
                if (data.visibility) {
                    _employee.visibility = data.visibility;
                }
                if (data.department) {
                    _employee.department = data.department;
                }
                if (data.groups) {
                    _employee.groups = data.groups;
                }
                if (data.whoCanRW) {
                    _employee.whoCanRW = data.whoCanRW;
                }
                if (data.jobPosition) {
                    _employee.jobPosition = data.jobPosition;
                }
                if (data.manager) {
                    _employee.manager = data.manager;
                }
                if (data.coach) {
                    _employee.coach = data.coach;
                }
                if (data.nationality) {
                    _employee.nationality = data.nationality;
                }
                if (data.identNo) {
                    _employee.identNo = data.identNo;
                }
                if (data.passportNo) {
                    _employee.passportNo = data.passportNo;
                }
                if (data.bankAccountNo) {
                    _employee.bankAccountNo = data.bankAccountNo;
                }
                if (data.otherId) {
                    _employee.otherId = data.otherId;
                }
                if (data.homeAddress) {
                    if (data.homeAddress.street) {
                        _employee.homeAddress.street = data.homeAddress.street;
                    }
                    if (data.homeAddress.city) {
                        _employee.homeAddress.city = data.homeAddress.city;
                    }
                    if (data.homeAddress.state) {
                        _employee.homeAddress.state = data.homeAddress.state;
                    }
                    if (data.homeAddress.zip) {
                        _employee.homeAddress.zip = data.homeAddress.zip;
                    }
                    if (data.homeAddress.country) {
                        _employee.homeAddress.country = data.homeAddress.country;
                    }
                }
                if (data.dateBirth) {
                    _employee.dateBirth = getDate(data.dateBirth);
                    _employee.age = getAge(data.dateBirth);
                }
                if (data.nextAction) {
                    _employee.nextAction = data.nextAction;
                }
                //new source (add Vasya)
                if (data.source) {
                    _employee.source = data.source;
                }
                if (data.referredBy) {
                    _employee.referredBy = data.referredBy;
                }
                if (data.active) {
                    _employee.active = data.active;
                }
                if (data.workflow) {
                    _employee.workflow = data.workflow;
                }
                if (data.otherInfo) {
                    _employee.otherInfo = data.otherInfo;
                }
                if (data.expectedSalary) {
                    _employee.expectedSalary = data.expectedSalary;
                }
                if (data.proposedSalary) {
                    _employee.proposedSalary = data.proposedSalary;
                }
                if (data.color) {
                    _employee.color = data.color;
                }
                if (data.imageSrc) {
                    _employee.imageSrc = data.imageSrc;
                }
                if (data.jobType) {
                    _employee.jobType = data.jobType;
                }
                if (data.nationality) {
                    _employee.nationality = data.nationality;
                }
                ///////////////////////////////////////////////////
                event.emit('updateSequence', models.get(req.session.lastDb, "Employees", employeeSchema), "sequence", 0, 0, _employee.workflow, _employee.workflow, true, false, function (sequence) {
                    _employee.sequence = sequence;
                    _employee.save(function (err, result) {
                        if (err) {
                            console.log(err);
                            logWriter.log("Employees.js create savetoBd _employee.save " + err);
                            res.send(500, { error: 'Employees.save BD error' });
                        } else {
                            res.send(201, { success: 'A new Employees create success', result: result, id: result._id });
                            if (result.isEmployee)
                                event.emit('recalculate', req);
                        }
                    });
                });
            }
        }
        catch (exception) {
            console.log(exception);
            logWriter.log("Employees.js  " + exception);
            res.send(500, { error: 'Employees.save  error' });
        }
    };//End create 

    function get(req, response) {
        var res = {};
        res['data'] = [];
        var query = models.get(req.session.lastDb, "Employees", employeeSchema).find();
        query.where('isEmployee', true);
        query.select('_id name').
        sort({ 'name.first': 1 });
        query.exec(function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log('Employees.js get Employee.find ' + err);
                response.send(500, { error: "Can't find JobPosition" });
            } else {
                res['data'] = result;
                response.send(res);
            }
        });
    };

    function getCollectionLengthByWorkflows(req, res) {
        data = {};
        data['showMore'] = false;
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

                    models.get(req.session.lastDb, "Employees", employeeSchema).aggregate(
                        {
                            $match: {
                                $and: [
                                    {
                                        isEmployee: false
                                    },
                                    {
                                        $or: [
                                            {
                                                $or: [
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.users': objectId(req.session.uId) }
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.group': { $in: arrOfObjectId } }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                $and: [
                                                    { whoCanRW: 'owner' },
                                                    { 'groups.owner': objectId(req.session.uId) }
                                                ]
                                            },
                                            { whoCanRW: "everyOne" }
                                        ]
                                    }
                                ]
                            }
                        },
                        {
                            $project: {
                                _id: 1,
                                workflow: 1
                            }
                        },
                        {
                            $group: {
                                _id: "$workflow",
                                count: { $sum: 1 }
                            }
                        },
                        function (err, responseOpportunities) {
                            if (!err) {
                                responseOpportunities.forEach(function (object) {
                                    if (object.count > req.session.kanbanSettings.applications.countPerPage) data['showMore'] = true;
                                });
                                data['arrayOfObjects'] = responseOpportunities;
                                res.send(data);
                            } else {
                                console.log(err);
                                logWriter.log("Employees.js getCollectionLengthByWorkflows " + err);
                            }
                        });
                } else {
                    console.log(err);
                    logWriter.log("Employees.js getCollectionLengthByWorkflows " + err);
                }
            });
    }

    function getEmployeesAlphabet(req, response) {
        var query = models.get(req.session.lastDb, "Employees", employeeSchema).aggregate([{ $match: { isEmployee: true } }, { $project: { later: { $substr: ["$name.last", 0, 1] } } }, { $group: { _id: "$later" } }]);
        query.exec(function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log("employees.js get employees alphabet " + err);
                response.send(500, { error: "Can't find employees" });
            } else {
                var res = {};
                res['data'] = result;
                response.send(res);
            }
        });
    };

    function getFilter(req, response) {
        var data = {};
        for (var i in req.query) {
            data[i] = req.query[i];
        }

        var viewType = data.viewType;
        var contentType = data.contentType;
        var res = {};
        res['data'] = [];
        var optionsObject = {};

        switch (contentType) {
            case ('Employees'): {
                optionsObject['isEmployee'] = true;
                if (data.filter.letter)
                    optionsObject['name.last'] = new RegExp('^[' + data.filter.letter.toLowerCase() + data.filter.letter.toUpperCase() + '].*');
            }
                break;
            case ('Applications'): {
                optionsObject['isEmployee'] = false;
            }
                break;
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

                    models.get(req.session.lastDb, "Employees", employeeSchema).aggregate(
                        {
                            $match: {
                                $and: [
                                    optionsObject,
                                    {
                                        $or: [
                                            {
                                                $or: [
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.users': objectId(req.session.uId) }
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.group': { $in: arrOfObjectId } }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                $and: [
                                                    { whoCanRW: 'owner' },
                                                    { 'groups.owner': objectId(req.session.uId) }
                                                ]
                                            },
                                            { whoCanRW: "everyOne" }
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
                                var query = models.get(req.session.lastDb, "Employees", employeeSchema).find().where('_id').in(result);
                                switch (contentType) {
                                    case ('Employees'):
                                        switch (viewType) {
                                            case ('list'): {
                                                if (data.sort) {
                                                    query.sort(data.sort);
                                                } else {
                                                    query.sort({ "editedBy.date": -1 });
                                                }

                                                query.select('_id name createdBy editedBy department jobPosition manager dateBirth skype workEmail workPhones jobType').
                                                    populate('manager', 'name').
                                                    populate('jobPosition', 'name').
                                                    populate('createdBy.user', 'login').
                                                    populate('department', 'departmentName').
                                                    populate('editedBy.user', 'login');
                                            }
                                                break;
                                            case ('thumbnails'): {
                                                query.select('_id name dateBirth age jobPosition relatedUser workPhones.mobile').
                                                    populate('relatedUser', 'login').
                                                    populate('jobPosition', 'name');
                                            }
                                                break;

                                        }
                                        break;
                                    case ('Applications'):
                                        switch (viewType) {
                                            case ('list'): {
                                                if (data && data.filter && data.filter.workflow) {
                                                    data.filter.workflow = data.filter.workflow.map(function (item) {
                                                        return item === "null" ? null : item;
                                                    });
                                                    query.where('workflow').in(data.filter.workflow);
                                                } else if (data && (!data.newCollection || data.newCollection === 'false')) {
                                                    query.where('workflow').in([]);
                                                }

                                                if (data.sort) {
                                                    query.sort(data.sort);
                                                } else {
                                                    query.sort({ "editedBy.date": -1 });
                                                }
                                                query.select('_id name createdBy editedBy jobPosition manager workEmail workPhones creationDate workflow personalEmail department jobType sequence').
                                                    populate('manager', 'name').
                                                    populate('jobPosition', 'name').
                                                    populate('createdBy.user', 'login').
                                                    populate('department', 'departmentName').
                                                    populate('editedBy.user', 'login').
                                                    populate('workflow', 'name status');
                                            }
                                                break;
                                            case ('thumbnails'): {

                                            }
                                                break;

                                        }
                                        break;
                                }

                                query.skip((data.page - 1) * data.count).
                                    limit(data.count).
                                    exec(function (error, _res) {
                                        if (!error) {
                                            res['data'] = _res;
                                            response.send(res);
                                        } else {
                                            console.log(error);
                                            logWriter.log("employees.js getFilter " + error);
                                        }
                                    });
                            } else {
                                console.log(err);
                                logWriter.log("employees.js getFilter " + err);
                            }
                        }
                    );
                } else {
                    console.log(err);
                    logWriter.log("employees.js getFilter " + err);
                }
            });

    };

    function getForDd(req, response) {
        var res = {};
        res['data'] = [];
        var query = models.get(req.session.lastDb, 'Employees', employeeSchema).find();
        query.where('isEmployee', true);
        query.select('_id name ');
        query.sort({ 'name.first': 1 });
        query.exec(function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log('Employees.js get Employee.find' + err);
                response.send(500, { error: "Can't find Employee" });
            } else {
                res['data'] = result;
                response.send(res);
            }
        });
    };

    function getForDdByRelatedUser(req, uId, response) {
        var res = {};
        res['data'] = [];
        var query = models.get(req.session.lastDb, "Employees", employeeSchema).find({ relatedUser: uId });
        query.where('isEmployee', true);
        query.select('_id name ');
        query.sort({ 'name.first': 1 });
        query.exec(function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log('Employees.js get Employee.find' + err);
                response.send(500, { error: "Can't find Employee" });
            } else {
                res['data'] = result;
                response.send(res);
            }
        });
    };

    function getApplications(req, response) {
        var res = {};
        res['data'] = [];
        var query = models.get(req.session.lastDb, "Employees", employeeSchema).find();

        query.where('isEmployee', false);
        query.populate('relatedUser department jobPosition workflow').
            populate('createdBy.user').
            populate('editedBy.user');

        query.sort({ 'name.first': 1 });
        query.exec(function (err, applications) {
            if (err) {
                console.log(err);
                logWriter.log('Employees.js get Application.find' + err);
                response.send(500, { error: "Can't find Application" });
            } else {
                res['data'] = applications;
                response.send(res);
            }
        });
    };

    function getApplicationsForKanban(req, data, response) {

        var res = {};
        var startTime = new Date();
        res['data'] = [];
        res['workflowId'] = data.workflowId;
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

                    models.get(req.session.lastDb, "Employees", employeeSchema).aggregate(
                        {
                            $match: {
                                $and: [
                                    {
                                        isEmployee: false
                                    },
                                    {
                                        workflow: objectId(data.workflowId)
                                    },
                                    {
                                        $or: [
                                            {
                                                $or: [
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.users': objectId(req.session.uId) }
                                                        ]
                                                    },
                                                    {
                                                        $and: [
                                                            { whoCanRW: 'group' },
                                                            { 'groups.group': { $in: arrOfObjectId } }
                                                        ]
                                                    }
                                                ]
                                            },
                                            {
                                                $and: [
                                                    { whoCanRW: 'owner' },
                                                    { 'groups.owner': objectId(req.session.uId) }
                                                ]
                                            },
                                            { whoCanRW: "everyOne" }
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
                        function (err, responseOpportunities) {
                            if (!err) {
                                models.get(req.session.lastDb, "Employees", employeeSchema).
                                    where('_id').in(responseOpportunities).
                                    select("_id name proposedSalary jobPosition nextAction workflow editedBy.date sequence").
                                    populate('jobPosition', 'name').
                                    populate('workflow', '_id').
                                    sort({ 'sequence': -1 }).
                                    limit(req.session.kanbanSettings.applications.countPerPage).
                                    exec(function (err, result) {
                                        if (!err) {
                                            res['data'] = result;
                                            res['time'] = (new Date() - startTime);
                                            res['workflowId'] = data.workflowId;
                                            res['fold'] = (req.session.kanbanSettings.applications.foldWorkflows && req.session.kanbanSettings.applications.foldWorkflows.indexOf(data.workflowId.toString()) !== -1);

                                            response.send(res);
                                        } else {
                                            logWriter.log("Employees.js getApplicationsForKanban opportunitie.find" + err);
                                            response.send(500, { error: "Can't find Applications" });
                                        }
                                    });
                            } else {
                                logWriter.log("Employees.js getApplicationsForKanban task.find " + err);
                                response.send(500, { error: "Can't group Applications" });
                            }
                        });
                } else {
                    logWriter.log("Employees.js getApplicationsForKanban task.find " + err);
                    console.log(err);
                }
            });
    };

    function getById(req, response) {
        var data = {};
        for (var i in req.query) {
            data[i] = req.query[i];
        }
        var query = models.get(req.session.lastDb, "Employees", employeeSchema).findById(data.id);
        query.populate('manager', 'name _id');
        query.populate('department', 'departmentName _id');
        query.populate('coach', 'name _id');
        query.populate('relatedUser', 'login _id');
        query.populate('jobPosition', 'name _id');
        query.populate('workflow').
			populate('createdBy.user').
            populate('editedBy.user').
            populate('groups.users').
            populate('groups.group').
            populate('groups.owner', '_id login');

        query.exec(function (err, findedEmployee) {
            if (err) {
                logWriter.log("Employees.js getById employee.find " + err);
                response.send(500, { error: "Can't find Employee" });
            } else {
                response.send(findedEmployee);
            }
        });

    }

    function updateOnlySelectedFields(req, _id, data, res) {
        var fileName = data.fileName;
        delete data.fileName;

        var updateObject = {};

        for (var i in data) {
            if (i === 'contractEndReason') {
                updateObject['isEmployee'] = false;
                updateObject['contractEnd'] = {
                    reason: data[i],
                    date: new Date()
                };
            } else {
                updateObject[i] = data[i];
            }
        }

        if (data.workflow && data.sequenceStart && data.workflowStart) {
            if (data.sequence == -1) {
                event.emit('updateSequence', models.get(req.session.lastDb, 'Employees', employeeSchema), "sequence", data.sequenceStart, data.sequence, data.workflowStart, data.workflowStart, false, true, function (sequence) {
                    event.emit('updateSequence', models.get(req.session.lastDb, 'Employees', employeeSchema), "sequence", data.sequenceStart, data.sequence, data.workflow, data.workflow, true, false, function (sequence) {
                        data.sequence = sequence;
                        if (data.workflow == data.workflowStart)
                            data.sequence -= 1;
                        models.get(req.session.lastDb, 'Employees', employeeSchema).findByIdAndUpdate(_id, { $set: data }, function (err, result) {
                            if (!err) {
                                res.send(200, { success: 'Employees updated', sequence: result.sequence });
                            } else {
                                res.send(500, { error: "Can't update Employees" });
                            }

                        });

                    });
                });
            } else {
                event.emit('updateSequence', models.get(req.session.lastDb, 'Employees', employeeSchema), "sequence", data.sequenceStart, data.sequence, data.workflowStart, data.workflow, false, false, function (sequence) {
                    delete data.sequenceStart;
                    delete data.workflowStart;
                    data.sequence = sequence;
                    models.get(req.session.lastDb, 'Employees', employeeSchema).findByIdAndUpdate(_id, { $set: data }, function (err, result) {
                        if (!err) {
                            res.send(200, { success: 'Employees updated' });
                        } else {
                            res.send(500, { error: "Can't update Employees" });
                        }

                    });
                });
            }
        } else {
            if (updateObject.dateBirth)
                updateObject['age'] = getAge(updateObject.dateBirth);
            models.get(req.session.lastDb, 'Employees', employeeSchema).findByIdAndUpdate(_id, { $set: updateObject }, function (err, result) {
                if (!err) {
                    if (updateObject.dateBirth || updateObject.contractEnd || updateObject.hired) {
                        event.emit('recalculate', req);
                    }
                    if (fileName) {
                        var os = require("os");
                        var osType = (os.type().split('_')[0]);
                        var path;
                        var dir;
                        switch (osType) {
                            case "Windows":
                                {
                                    var newDirname = __dirname.replace("\\Modules", "");
                                    while (newDirname.indexOf("\\") !== -1) {
                                        newDirname = newDirname.replace("\\", "\/");
                                    }
                                    path = newDirname + "\/uploads\/" + _id + "\/" + fileName;
                                    dir = newDirname + "\/uploads\/" + _id;
                                }
                                break;
                            case "Linux":
                                {
                                    var newDirname = __dirname.replace("/Modules", "");
                                    while (newDirname.indexOf("\\") !== -1) {
                                        newDirname = newDirname.replace("\\", "\/");
                                    }
                                    path = newDirname + "\/uploads\/" + _id + "\/" + fileName;
                                    dir = newDirname + "\/uploads\/" + _id;
                                }
                        }

                        fs.unlink(path, function (err) {
                            console.log(err);
                            fs.readdir(dir, function (err, files) {
                                if (files && files.length === 0) {
                                    fs.rmdir(dir, function () {
                                    });
                                };
                                if(err){
                                    logWriter.log("Employees.js " + err.stack || err);
                                }
                            });
                        });

                    }
                    res.send(200, { success: 'Employees updated', result: result });
                } else {
                    res.send(500, { error: "Can't update Employees" });
                }

            });
        }
    }

    function addAtach(req, _id, files, res) {//to be deleted
        models.get(req.session.lastDb, "Employees", employeeSchema).findByIdAndUpdate(_id, { $push: { attachments: { $each: files } } }, { upsert: true }, function (err, result) {
            try {
                if (err) {
                    console.log(err);
                    logWriter.log("Employees.js update employee.update " + err);
                    res.send(500, { error: "Can't update Employees" });
                } else {
                    res.send(200, { success: 'Employees updated success', data: result });
                    if (data.recalculate) {
                        event.emit('recalculate', req);
                    }
                }
            }
            catch (exception) {
                logWriter.log("Employees.js getEmployees employee.find " + exception);
            }
        });
    }// end update

    function remove(req, _id, res) {
        models.get(req.session.lastDb, "Employees", employeeSchema).findByIdAndRemove(_id, function (err, result) {
            if (err) {
                console.log(err);
                logWriter.log("Employees.js remove employee.remove " + err);
                res.send(500, { error: "Can't remove Employees" });
            } else {
                if (result && !result.isEmployee) {
                    event.emit('updateSequence', models.get(req.session.lastDb, "Employees", employeeSchema), "sequence", result.sequence, 0, result.workflow, result.workflow, false, true, function () {
                        res.send(200, { success: 'Employees removed' });
                    });
                }
                event.emit('recalculate', req);
                res.send(200, { success: 'Employees removed' });
            }
        });
    }// end remove

    function getEmployeesImages(req, data, res) {
        var query = models.get(req.session.lastDb, "Employees", employeeSchema).find({ isEmployee: true });
        query.where('_id').in(data.ids).
			select('_id imageSrc').
            exec(function (error, response) {
                if (error) {
                    console.log(error);
                    logWriter.log("Employees.js remove employee.remove " + error);
                    res.send(500, { error: "Can't find Employees Imgs" });
                } else res.send(200, { data: response });
            });

    };

    return {
        getTotalCount: getTotalCount,

        create: create,

        get: get,

        getCollectionLengthByWorkflows: getCollectionLengthByWorkflows,

        getFilter: getFilter,

        getEmployeesAlphabet: getEmployeesAlphabet,

        getForDd: getForDd,

        getForDdByRelatedUser: getForDdByRelatedUser,

        addAtach: addAtach,

        updateOnlySelectedFields: updateOnlySelectedFields,

        remove: remove,

        getApplications: getApplications,

        getApplicationsForKanban: getApplicationsForKanban,

        getEmployeesImages: getEmployeesImages,

        getById: getById
    };
};

module.exports = Employee;
