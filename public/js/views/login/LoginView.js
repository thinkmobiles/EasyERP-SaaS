define([
    'text!templates/login/LoginTemplate.html',
    'custom',
    'communication'
], function (LoginTemplate, Custom, Communication) {

    var LoginView = Backbone.View.extend({
        el: '#wrapper',
        initialize: function (options) {
            if (options && options.dbs) {
                this.render(options);
            } else {
                this.render();
            }
        },
        events: {
            "submit #loginForm": "login",
            "click .login-button": "login",
            "focus #ulogin": "usernameFocus",
            "focus #upass": "passwordFocus",
            "focusout #ulogin": "usernameFocus",
            "focusout #upass": "passwordFocus",
            "click .remember-me": "checkClick"
        },
        render: function (options) {
            $('title').text('Login');
            if (options) {
                this.$el.html(_.template(LoginTemplate, {options: options.dbs}));
            } else {
                this.$el.html(LoginTemplate);
                $("#loginForm").addClass("notRegister");
            }
            return this;
        },
        usernameFocus: function (event) {
            this.$el.find(".icon-login").toggleClass("active");
        },
        passwordFocus: function (event) {
            this.$el.find(".icon-pass").toggleClass("active");

        },

        checkClick: function (event) {
            this.$el.find(".remember-me").toggleClass("active");
            if (this.$el.find("#urem").attr("checked")) {
                this.$el.find("#urem").removeAttr("checked");
            } else {
                this.$el.find("#urem").attr("checked", "checked");
            }
        },

        login: function (event) {
            var emailRegExp = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            var err = "";
            var data;

            event.preventDefault();
            $("#loginForm").removeClass("notRegister");
            $("#loginForm").removeClass("notRegister");
            data = {
                //login: this.$("#ulogin").val(),
                email: this.$("#ulogin").val(),
                pass: this.$("#upass").val()
            };

            if (data.email && !emailRegExp.test(data.email)) {
                err += "Email is invalid<br/>";
            }
            if (data.pass.length < 3) {
                err += "Password must be longer than 3 characters";
            }
            if (err) {
                $("#loginForm .error").html(err);
                $("#loginForm").addClass("notRegister");
                return;
            }
            if (data.login == "") {
                $("#loginForm").addClass("notRegister");
            }
            $.ajax({
                url: "/login",
                type: "POST",
                data: data,
                success: function (response) {
                    var hostName = window.location.hostname;
                    var accountName = response.accountName;
                    var livePos;
                    var url;

                    if (hostName.indexOf(accountName) === -1) {
                        livePos = hostName.indexOf('live');

                        if (livePos !== -1) {
                            url = accountName + '.' + hostName.substr(livePos);
                            url += '/#easyErp';
                            window.location = 'http://'+ url;
                        }
                    }

                    Custom.runApplication(true);
                },
                error: function () {
                    //Custom.runApplication(false, "Server is unavailable...");
                    $("#loginForm").addClass("notRegister");
                    $("#loginForm .error").text("Such user doesn't registered");
                }
            });
        }
    });

    return LoginView;

});
