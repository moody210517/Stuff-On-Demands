//'use strict';

// Angular Module's Initializations
angular.module('handyforall.authentication', []);
angular.module('handyforall.contactus', []);
angular.module('handyforall.page', []);
angular.module('handyforall.faq', []);
angular.module('handyforall.becometasker', []);
angular.module('handyforall.category', []);
angular.module('handyforall.task', []);
angular.module('handyforall.accounts', []);
angular.module('handyforall.messages', []);
angular.module('handyforall.carddeatil', []);
angular.module('handyforall.forgotpassword', []);
angular.module('handyforall.notifications', []);

//Main module
angular.module('handyforall.site', [
    'ngAnimate',
    'ngSanitize',
    'ngCookies',
    'ui.calendar',
    'ui.validate',
    'ui.bootstrap',
    'ui.router',
    'toastr',
    'pascalprecht.translate',
    'ngFileUpload',
    'ngMap',
    'ngImgCrop',
    'slugifier',
    'checklist-model',
    'ngIntlTelInput',
    'angular-sweetalert',
    'ui.select',
    'ngMeta',
    'ui.slider',
    'ngMaterial',
    'ngMessages',
    'afkl.lazyImage',
    'handyforall.config',
    'handyforall.authentication',
    'handyforall.contactus',
    'handyforall.faq',
    'handyforall.becometasker',
    'handyforall.category',
    'handyforall.task',
    'handyforall.page',
    'handyforall.accounts',
    'handyforall.messages',
    'handyforall.carddeatil',
    'handyforall.notifications',
    'handyforall.forgotpassword',
    'slickCarousel',
    'rzModule',
    'multipleDatePicker'
])
    .run(['$rootScope', '$state', '$location', '$cookieStore', '$http', '$stateParams', 'AuthenticationService', 'toastr', 'MainService', '$window', 'socket', 'ngMeta', '$cookieStore', '$transitions', function ($rootScope, $state, $location, $cookieStore, $http, $stateParams, AuthenticationService, toastr, MainService, $window, socket, ngMeta, $cookieStore, $transitions) {
        ngMeta.init();
        $rootScope.$state = $state;
        //$rootScope.showAlert = true;
        $rootScope.siteglobals = $cookieStore.get('siteglobals') || {};

        // For Designs
        $rootScope.opensidenav = function () {
            $(".sidenav-wrap").css('left', '0');
            $("body").addClass("sidenavoverlay");
            $(".sidenav-wrap").addClass("active");
            $(".navbar-toggle").addClass("collapsed");
        };

        $rootScope.closesidenav = function () {
            $(".sidenav-wrap").css('left', '-150%');
            $("body").removeClass("sidenavoverlay");
            $(".sidenav-wrap").removeClass("active");
            $(".navbar-toggle").removeClass("collapsed");
        };

        $(document).on("click", function (e) {
            if ($('.navbar-toggle:not(.collapsed)').is(e.target) || $('.navbar-toggle:not(.collapsed)').has(e.target).length != 0) {
                $rootScope.opensidenav();
            } else if (!$('.sidenav-wrap').is(e.target) || !$('.sidenav-wrap').has(e.target)) {
                $rootScope.closesidenav();
            }
        });
        // For Designs end

        if ($rootScope.siteglobals.currentUser) {
            console.log("$rootScope.siteglobals.currentUser", $rootScope.siteglobals.currentUser);
            $http.defaults.headers.common['Authorization'] = $rootScope.siteglobals.currentUser.authdata;
        }



        $transitions.onStart({}, function (trans) {

            // $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {

            //var event = {};
            var toState = trans.to();
            var toParams = trans.params('to');
            var fromState = trans.from();
            var fromParams = trans.params('from');

            var userdata = AuthenticationService.GetCredentials();

            if (userdata.currentUser) {
                if (toState.name == "hirestep1" && userdata.currentUser.user_type == 'tasker') {
                    $state.go('login', { type: 'user' });
                    toastr.error("Tasker Cannot  access");
                    //event.preventDefault();
                }
            }

            if (toState.name == "chat") {
                if (!$rootScope.siteglobals.currentUser) {
                    $state.go('login', { type: 'user' });
                    //event.preventDefault();
                }
            }
            if (toState.authenticate && !AuthenticationService.isAuthenticated()) {
                $state.go('login', { type: 'user' });
                //event.preventDefault();
            }

            //commented by vivek
            if (toState.registerauthenticate && !((toParams.type == 'user' || toParams.type == 'tasker') && !AuthenticationService.isAuthenticated())) {
                if (AuthenticationService.isAuthenticated()) {
                    $state.transitionTo("landing");
                } else {
                    $state.go('register', { type: 'user' });
                }
                //event.preventDefault();
            }
            //commented by vivek

            if (toState.taskerauthenticate && AuthenticationService.isTaskerAuthenticated()) {
                $state.transitionTo("landing");
                //event.preventDefault();
            }

            if (toState.loginauthenticate && AuthenticationService.isAuthenticated()) {
                $state.transitionTo("landing");
                //event.preventDefault();
            }

            $rootScope.currentStateHTML = toState; // For Designs

            // Store state history
            if (toState.name != 'login' && toState.name != 'signupotp' && toState.name != 'social' && toState.name != 'register' && toState.name != 'hirestep1' && toState.name != 'signup') {
                $rootScope.PreviousState = fromState;
                $rootScope.Previousparams = fromParams;
                $rootScope.currentState = toState;
                $rootScope.currentparams = toParams;

                // Clear selected category
                if ($rootScope.PreviousState.name != 'login' && $rootScope.currentState.name == 'landing') {
                    $rootScope.selectedCategory = {};
                }

            }

        });
    }])
    .factory('myHttpInterceptor', function ($q, $location, $rootScope, $cookieStore) {
        var timestampMarker = {
            response: function (response) {
                $rootScope.imgSrc = false;
                if (response.status == 404) {
                    $location.path('/404');
                }
                return response;
            },
            'responseError': function (rejection) {
                if (rejection.status == 401) {
                    $cookieStore.remove('siteglobals')
                    $location.path('/login/user');
                }
                return $q.reject(rejection);
            },
            request: function (config) {
                $rootScope.imgSrc = "/app/site/public/images/loader.gif";
                return config || $q.when(config);
            }
        };
        return timestampMarker;
    })

    // === Routes On New Version ===
    .provider("routes", function routeProvider() {
        return ({
            $get: restAPIs
        });

        function restAPIs() {
            return ({
                // COMMON
                "landingPage": { url: '/site/landing/landingdata', method: 'POST' },
                "userRegister": { url: '/siteregister', method: 'POST' },
                "userLogin": { url: '/site', method: 'POST' },
                "userSaveaccount": { url: '/site/account/settings/save', method: 'POST' },
                "settingUrl": { method: 'POST', url: "/site/account/getsettings" },
                "seoUrl": { method: 'GET', url: "/site/landing/getseosetting" },
                "defaultCurrency": { method: 'GET', url: "/site/landing/getDefaultCurrency?name=" },
                "getmaincat": { method: "POST", url: "/site/account/getmaincatname" },
                "pdf": { method: "GET", url: "/site/account/downloadPdf" },
                // USER REST API
                "userProfile": { method: 'POST', url: "/site/account/profile" },
                "userPassword": { method: 'POST', url: "/site/account/password-change" },
                "walletRechargeStripe": { method: 'POST', url: "/site/account/updatewalletdata" },
                "walletDetails": { method: "POST", url: "/site/account/getwalletdetails" },
                "walletRechargePaypal": { method: "POST", url: "/site/account/updatewalletdatapaypal" },
                "walletTransaction": { method: "POST", url: "/site/account/getuserwallettransaction" },
                "userUpdateAcc": { method: "POST", url: "/site/account/settings/save" },
                "userDeactiveAcc": { method: "POST", url: "/site/account/deactivateAccount" },
                "taskList": { method: "POST", url: "/site/account/getTaskList" },
                "taskSearchList": { method: "POST", url: "/site/account/getSearchTaskList" },
                "userTaskDetails": { method: "POST", url: "/site/account/getTaskDetails" },
                "userTransactions": { method: "POST", url: "/site/account/usertranscation" },
                "userReview": { method: "POST", url: "/site/account/getuserReview" },
                "taskCancelReason": { method: "POST", url: "/site/account/getcancelreason" },
                "taskCancel": { method: "POST", url: "/site/account/usercanceltask" },
                "taskReview": { method: "POST", url: "/site/account/gettaskreview" },
                "addUserReview": { method: "POST", url: "/site/account/addReview" },
                // TASKER REST API
                "taskerProfile": { method: "POST", url: "/site/account/tasker/profile" },
                "taskerUpdateAcc": { method: "POST", url: "/site/account/tasker/settings/save" },
                "taskerPassword": { method: "POST", url: "/site/account/tasker/password/save" },
                "taskerDeactiveAcc": { method: "POST", url: "/site/account/deactivateTaskertAccount" },
                "taskerReview": { method: "POST", url: "/site/account/getreview" },
                "taskerTransactions": { method: "POST", url: "/site/account/transcationhis" },
                "bank": { method: "POST", url: "/site/account/saveaccountinfo" },
                "category": { method: "POST", url: "/site/account/categories/get" },
                "usercat": { method: "POST", url: "/site/account/getcategoriesofuser" },
                "catexp": { method: "POST", url: "/site/account/categories/get-experience" },
                "accEdit": { method: "POST", url: "/site/account/edit" },
                "catChild": { method: "POST", url: "/site/account/categories/getchild" },
                "addUpdateCat": { method: "POST", url: "/site/account/updatecategoryinfo" },
                "delCat": { method: "POST", url: "/site/account/deleteCategory" },
                "availabity": { method: "POST", url: "/site/account/availability/save" },
                "unavailability": { method: "POST", url: "/site/account/unavailability/save" },
                "taskerTaskDetails": { method: "POST", url: "/site/account/getTaskDetailsByStaus" },
                "searchTaskerTaskDetails": { method: "POST", url: "/site/account/getSearchTaskDetailsByStaus" },
                "UpdateTaskStatus": { method: "POST", url: "/site/account/updatetaskstatus" },
                "confirmTask": { method: "POST", url: "/site/account/taskerconfirmtask" },
                "insertReview": { method: "POST", url: "/site/account/insertaskerReview" },
                "taskComplete": { method: "POST", url: "/site/account/updateTaskcompletion" },
                "getQuestion": { method: "GET", url: "/site/account/question/getQuestion" },
                "updateAbout": { method: "POST", url: "/site/account/updateprofiledetails" },
                "ignoreTask": { method: "POST", url: "/site/account/ignoreTask" }
            });
        }
    })
    // === / Routes On New Version ===

    .config(function (ngMetaProvider, ngIntlTelInputProvider, toastrConfig) {
        ngMetaProvider.useTitleSuffix(true);
        ngIntlTelInputProvider.set({ defaultCountry: '' });
        angular.extend(toastrConfig, {
            autoDismiss: true,
            maxOpened: 1,
            tapToDismiss: true,
            closeButton: true,
            closeHtml: '<i class="fa fa-times"></i>'
        });
    })
    .config(['slickCarouselConfig', function (slickCarouselConfig) {
        slickCarouselConfig.dots = true;
        slickCarouselConfig.autoplay = false;
    }])
    .config(['$translateProvider', '$urlMatcherFactoryProvider', function ($translateProvider, $urlMatcherFactoryProvider) {
        $translateProvider.useStaticFilesLoader({
            prefix: '/uploads/languages/',
            suffix: '.json'
        });
        $translateProvider.useLocalStorage();
        $translateProvider.preferredLanguage('en');
        $translateProvider.useSanitizeValueStrategy(null);
        $translateProvider.fallbackLanguage('en');
        $urlMatcherFactoryProvider.caseInsensitive(false);
        $urlMatcherFactoryProvider.strictMode(true);
    }])
    .factory('PreviousState', ['$rootScope', '$state',
        function ($rootScope, $state) {
            var lastHref = "/",
                lastStateName = "landing",
                lastParams = {},
                event = "";
            $rootScope.$on("$stateChangeSuccess", function (events, toState, toParams, fromState, fromParams) {
                event = events;
                lastStateName = fromState.name;
                lastParams = fromParams;
                lastHref = $state.href(lastStateName, lastParams)
            });
            return {
                getLastHref: function () { return lastHref; },
                goToLastState: function () {
                    return $state.go(lastStateName, lastParams);
                }
            }
        }
    ])
    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$httpProvider', function ($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider) {
        $locationProvider.html5Mode(true);
        $urlRouterProvider
            .when('/account', ['$state', function ($state, myService) { $state.go('account.profile'); }])
            .otherwise('/404');
        $httpProvider.interceptors.push('myHttpInterceptor');

        $stateProvider
            .state('landing', {
                url: '/',
                views: {
                    "content": {
                        templateUrl: "app/site/modules/common/views/landing.html",
                        controller: "MainCtrl",
                        controllerAs: 'MAC'
                    },

                },
                data: {
                    meta: {
                        'title': 'Home'
                    }
                },
                resolve: {
                    MainserviceResolve: function (MainService, routes) {
                        return MainService.getData(routes.landingPage, {});
                    }
                }
            })
            .state('morecategories', {
                url: '/morecategories',
                views: {
                    "content": {
                        templateUrl: "app/site/modules/common/views/morecategories.html",
                        controller: "MorecategoryCtrl",
                        controllerAs: 'MOC'
                    }
                },
                resolve: {
                    MorecategoryserviceResolve: function (MainService, $stateParams) {
                        return MainService.getmorecategory(0);
                    }
                }
            })
            .state('category', {
                url: '/category/:slug',
                views: {
                    "content": {
                        templateUrl: "/app/site/modules/category/views/category.html",
                        controller: "categoryCtrl",
                        controllerAs: 'CAC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Category'
                    }
                },
                resolve: {
                    CategoryserviceResolve: function (CategoryService, $stateParams) {
                        return CategoryService.getcategory($stateParams.slug, 0, 6);
                    }
                }
            })
            .state('forgotpwd', {
                url: '/forgot-password/:type',
                loginauthenticate: true,
                views: {
                    specialview: {
                        templateUrl: "app/site/modules/common/views/forgot-password.html",
                        controller: "pwdloginCtrl",
                        controllerAs: 'PWC'
                    },
                    commonview: { template: "<div></div>" }
                },
                data: {
                    meta: {
                        'title': 'Forgot Your Password'
                    }
                }
            })
            .state('signupotp', {
                url: '/userverfication/:id',
                views: {
                    commonview: {
                        templateUrl: "app/site/modules/common/views/OTPSignup_model.html",
                        controller: "otploginCtrl",
                        controllerAs: 'OTPC'
                    }
                }
            })
            .state('forgotpwdusermail', {
                url: '/reset-password/:type/:userid/:resetid',
                loginauthenticate: true,
                views: {
                    specialview: {
                        templateUrl: "app/site/modules/common/views/reset-password.html",
                        controller: "pwdmailCtrl",
                        controllerAs: 'PWMC'
                    },
                    commonview: { template: "<div></div>" }
                },
                data: {
                    meta: {
                        'title': 'Forgot Your Password'
                    }
                }
            })
            .state('page', {
                url: '/page/:slug',
                views: {
                    "content": {
                        templateUrl: "/app/site/modules/pages/views/pages.html",
                        controller: "pagesCtrl",
                        controllerAs: 'PAC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Page'
                    }
                },
                resolve: {

                    PagesserviceResolve: function (PageService, $stateParams, $rootScope, $cookieStore, MainService) {
                        var languageUpdateValue = $cookieStore.get('language');
                        if ($rootScope.language == undefined) {
                            $rootScope.language = languageUpdateValue;
                        }
                        return PageService.getpage($stateParams, $rootScope.language);
                    }
                }
            })
            .state('login', {
                url: '/login',
                loginauthenticate: true,
                views: {
                    specialview: {
                        templateUrl: "app/site/modules/common/views/login.html",
                        controller: "userloginCtrl",
                        controllerAs: 'ULGC'
                    },
                    commonview: {
                        template: "<div></div>"
                    }
                },
                data: {
                    meta: {
                        'title': 'User Login'
                    }
                }
            })
            .state('contact-us', {
                url: '/contact-us',
                views: {
                    "content": {
                        templateUrl: "app/site/modules/common/views/contactus.html",
                        controller: "contactCtrl",
                        controllerAs: 'CTTC'
                    },
                },
                data: {
                    meta: {
                        'title': 'Contact Us'
                    }
                }
            })
            .state('faq', {
                url: '/faq',
                views: {
                    "content": {
                        templateUrl: "/app/site/modules/common/views/faq.html",
                        controller: "faqCtrl",
                        controllerAs: 'FAC'
                    }
                },
                data: {
                    meta: {
                        'title': 'FAQ'
                    }
                },
                resolve: {
                    FaqserviceResolve: function (FaqService) {
                        return FaqService.getfaq();

                    }
                }
            })
            .state('messages', {
                url: '/messages',
                authenticate: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/messages/views/messages.html",
                        controller: "messagesCtrl",
                        controllerAs: 'MSG'
                    }
                },
                data: {
                    meta: {
                        'title': 'Messages'
                    }
                },
                resolve: {
                    MessageserviceResolve: function (AuthenticationService, MessageService) {
                        var user = AuthenticationService.GetCredentials();
                        return MessageService.getMessage(user.currentUser.user_id, user.currentUser.user_type, 0, 3);
                    },
                    CurrentuserResolve: function (AuthenticationService) {
                        var user = AuthenticationService.GetCredentials();
                        return user.currentUser;
                    }
                }
            })
            .state('notifications', {
                url: '/notifications',
                authenticate: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/notifications/views/notifications.html",
                        controller: "notificationCtrl",
                        controllerAs: 'NC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Notifications'
                    }
                },
                resolve: {
                    NotificationsResolve: function (AuthenticationService, NotificationService) {
                        var user = AuthenticationService.GetCredentials();
                        var data = {};
                        data.user = user.currentUser.user_id;
                        data.type = user.currentUser.user_type;
                        return NotificationService.getMessage(data, 0, 3);
                    },
                    accountProfileResolve: function (AuthenticationService, $rootScope, MainService, routes) {
                        var user = AuthenticationService.GetCredentials();
                        if (user.currentUser.user_id) {
                            var userId = $rootScope.userId;
                            if (user.currentUser.user_type == 'user') {
                                return MainService.getData(routes.userProfile, { userId: userId });
                            } else if (user.currentUser.user_type == 'tasker') {
                                return MainService.getData(routes.taskerProfile, { userId: userId });
                            }
                        }
                    }
                }
            })
            .state('404', {
                url: '/404',
                views: {
                    specialview: {
                        templateUrl: "app/site/modules/common/views/404.html"
                    },
                    commonview: { template: "<div></div>" }
                },
                data: {
                    meta: {
                        'title': 'PageNotFound'
                    }
                }
            })
            .state('chat', {
                url: '/chat/:task/:user/:tasker',
                views: {
                    "content": {
                        templateUrl: "app/site/modules/messages/views/chat.html",
                        controller: "chatCtrl",
                        controllerAs: 'CHAT'
                    }
                },
                data: {
                    meta: {
                        'title': 'Messenger'
                    }
                },
                resolve: {
                    ChatServiceResolve: function (AuthenticationService, MessageService, $stateParams, socket) {
                        var user = AuthenticationService.GetCredentials();
                        var data = {};
                        data.task = $stateParams.task;
                        data.user = $stateParams.user;
                        data.tasker = $stateParams.tasker;
                        data.type = user.currentUser.user_type;
                        return MessageService.chatHistory(data);
                    },
                    TaskServiceResolve: function (TaskService, $stateParams) {
                        return TaskService.getTaskDetailsbyid($stateParams.task);
                    },
                    TaskProfileResolve: function (TaskService, $stateParams) {
                        return TaskService.taskprofileinfo($stateParams.tasker);
                    },
                    CurrentuserResolve: function (AuthenticationService) {
                        var user = AuthenticationService.GetCredentials();
                        return user.currentUser;
                    }
                }
            })
            .state('register', {
                url: '/register',
                loginauthenticate: true,
                views: {
                    "specialview": {
                        templateUrl: "app/site/modules/common/views/register.html",
                        controller: "registerCtrl",
                        controllerAs: 'RGC'
                    },
                    "commonview": { template: "<div></div>" }
                },
                data: {
                    meta: {
                        'title': 'User SignUp'
                    }
                },
                resolve: {
                    CategoryserviceResolve: function (CategoryService) {
                        return CategoryService.getcategoryList();
                    },
                    settingsResolve: function (MainService, routes) {
                        return MainService.getData(routes.settingUrl, {});
                    },
                }
            })
            .state('becometasker', {
                url: '/become-tasker',
                views: {
                    "content": {
                        template: '<div ui-view="becometasker"></div>',
                        controller: "registerCtrl",
                        controllerAs: 'RGC'
                    }

                },
                data: {
                    meta: {
                        'title': 'Tasker SignUp'
                    }
                },
                resolve: {
                    CategoryserviceResolve: function (CategoryService) {
                        return CategoryService.getcategoryList();
                    },
                    settingsResolve: function (MainService, routes) {
                        return MainService.getData(routes.settingUrl, {});
                    }
                }
            })
            .state('becometasker.step1', {
                url: '/basicinfo',
                taskerauthenticate: true,
                views: {
                    "becometasker": {
                        templateUrl: "app/site/modules/tasker/views/taskerinfo.html",
                        controller: "registerCtrl",
                        controllerAs: 'RGC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Tasker SignUp'
                    }
                },
                resolve: {
                    CategoryserviceResolve: function (CategoryService) {
                        return CategoryService.getcategoryList();
                    },
                    settingsResolve: function (MainService, routes) {
                        return MainService.getData(routes.settingUrl, {});
                    }
                }
            })
            .state('becometasker.step3', {
                url: '/basicinfo',
                taskerauthenticate: true,
                views: {
                    "becometasker": {
                        templateUrl: "app/site/modules/tasker/views/availabiltyInfo-step3.html"
                    }
                },
                data: {
                    meta: {
                        'title': 'Tasker SignUp'
                    }
                }
            })
            .state('becometasker.step7', {
                url: '/basicinfo',
                taskerauthenticate: true,
                views: {
                    "becometasker": {
                        templateUrl: "app/site/modules/tasker/views/imageInfo-step7.html"
                    }
                },
                data: {
                    meta: {
                        'title': 'Tasker SignUp'
                    }
                }
            })
            .state('becometasker.step8', {
                url: '/basicinfo',
                taskerauthenticate: true,
                views: {
                    "becometasker": {
                        templateUrl: "app/site/modules/tasker/views/hoursInfo-step8.html"
                    }
                },
                data: {
                    meta: {
                        'title': 'Tasker SignUp'
                    }
                }
            })
            .state('becometasker.success', {
                url: '/basicinfo',
                views: {
                    "becometasker": {
                        templateUrl: "app/site/modules/tasker/views/thankpop.html"
                    }
                },
                data: {
                    meta: {
                        'title': 'Tasker SignUp'
                    }
                }
            })
            .state('taskerinfo', {
                url: '/taskerinfo',
                views: {
                    content: {
                        //templateUrl: "app/site/modules/tasker/views/taskerinfo.html",
                        controller: "taskinfoCtrl",
                        controllerAs: 'TIC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Tasker SignUp'
                    }
                }
            })
            .state('hirestep1', {
                url: '/hirestep1/:slug',
                views: {
                    content: {
                        templateUrl: "app/site/modules/task-step/views/hire-step1.html",
                        controller: "taskCtrl",
                        controllerAs: 'TAC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Task'
                    }
                },
                resolve: {
                    TaskserviceResolve: function (TaskService, $stateParams, AuthenticationService) {
                        return TaskService.taskbaseinfo($stateParams.slug);
                    },
                    CurrentUserTaskserviceResolve: function (MainService, AuthenticationService) {
                        var user = AuthenticationService.GetCredentials();
                        if (!user.currentUser) {
                            var data = [];
                            var datas = {};
                            datas.addressList = [];
                            data.push(datas);
                            return data;
                        }
                        else {
                            return MainService.getCurrentUsers(user.currentUser.user_id);
                        }
                    }
                }
            })
            .state('search', {
                url: '/search/:task?&query',
                views: {
                    content: {
                        templateUrl: "app/site/modules/task-step/views/search-results.html",
                        controller: "taskFilterCtrl",
                        controllerAs: 'TFC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Pick A Tasker'
                    }
                },
                resolve: {
                    SearchResolve: function (TaskService, $stateParams) {
                        return TaskService.searchTasker($stateParams.task);
                    }
                }
            })
            .state('account', {
                url: '/account',
                authenticate: true,
                abstract: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/accounts/views/new-account/header.html",
                        controller: "AccountHeaderCtrl",
                        controllerAs: 'AHC'
                    }
                },
                data: {
                    meta: {
                        'title': 'My Account'
                    }
                },
                resolve: {
                    accountProfileResolve: function (AuthenticationService, $rootScope, MainService, routes) {
                        var user = AuthenticationService.GetCredentials();
                        if (user.currentUser.user_id) {
                            var userId = $rootScope.userId;
                            if (user.currentUser.user_type == 'user') {
                                return MainService.getData(routes.userProfile, { userId: userId });
                            } else if (user.currentUser.user_type == 'tasker') {
                                return MainService.getData(routes.taskerProfile, { userId: userId });
                            }
                        }
                    },
                    seoSettingsResolve: function (MainService, routes) {
                        return MainService.getData(routes.seoUrl, {});
                    },
                    settingsResolve: function (MainService, routes) {
                        return MainService.getData(routes.settingUrl, {});
                    },
                    defaultCurrency: function (MainService, routes) {
                        var data;
                        return MainService.getDefaultCurrency(data);
                    }
                }
            })
            .state('account.profile', {
                url: '/profile',
                action: 'add',
                controller: "AccountProfileCtrl",
                controllerAs: 'ACC',
                templateUrl: "app/site/modules/accounts/views/new-account/profile.html"
            })
            .state('account.password', {
                url: '/password',
                action: 'add',
                controller: "AccountPasswordCtrl",
                controllerAs: 'APC',
                templateUrl: "app/site/modules/accounts/views/new-account/password.html"
            })
            .state('account.tasks', {
                url: '/tasks',
                action: 'all',
                controller: "AccountTasksCtrl",
                controllerAs: 'ATC',
                templateUrl: "app/site/modules/accounts/views/new-account/tasks.html"
            })
            .state('account.invites', {
                url: '/invites',
                action: 'add',
                controller: "AccountInviteFriends",
                controllerAs: 'AIF',
                templateUrl: "app/site/modules/accounts/views/new-account/invites.html"
            })
            .state('account.wallet', {
                url: '/wallet',
                action: 'add',
                controller: "accountWalletCtrl",
                controllerAs: 'AWC',
                templateUrl: "app/site/modules/accounts/views/new-account/wallet.html"
            })
            .state('account.transactions', {
                url: '/transactions',
                action: 'add',
                controller: "AccountTransactionCtrl",
                controllerAs: 'ATC',
                templateUrl: "app/site/modules/accounts/views/new-account/transation-profile.html"
            })
            .state('account.reviews', {
                url: '/reviews',
                action: 'add',
                controller: "AccountReviewCtrl",
                controllerAs: 'ARC',
                templateUrl: "app/site/modules/accounts/views/new-account/reviews.html"
            })
            .state('account.deactivate', {
                url: '/deactivate',
                action: 'add',
                controller: "AccountDeactivateCtrl",
                controllerAs: 'ADC',
                templateUrl: "app/site/modules/accounts/views/new-account/deactive.html"
            })
            .state('account.information', {
                url: '/information',
                action: 'add',
                controller: "AccountInformationCtrl",
                controllerAs: 'AIC',
                templateUrl: "app/site/modules/accounts/views/new-account/information.html"
            })
            .state('account.category', {
                url: '/category',
                action: 'add',
                controller: "AccountCategoryCtrl",
                controllerAs: 'ACC',
                templateUrl: "app/site/modules/accounts/views/new-account/category.html"
            })
            .state('account.availabity', {
                url: '/availabity',
                action: 'add',
                controller: "AccountAvailabityCtrl",
                controllerAs: 'AAC',
                templateUrl: "app/site/modules/accounts/views/new-account/availabity.html"
            })
            .state('account.unavailability', {
                url: '/unavailability',
                action: 'add',
                controller: "AccountUnavailabilityCtrl",
                controllerAs: 'AUC',
                templateUrl: "app/site/modules/accounts/views/new-account/unavailability.html"
            })
            .state('account.job', {
                url: '/job',
                action: 'add',
                controller: "AccountTaskerJobCtrl",
                controllerAs: 'AJC',
                templateUrl: "app/site/modules/accounts/views/new-account/job.html"
            })
            .state('account.about', {
                url: '/about',
                action: 'add',
                controller: "AccountProfileCtrl",
                controllerAs: 'ACC',
                templateUrl: "app/site/modules/accounts/views/new-account/about.html"
            })
            .state('carddeatil', {
                url: '/carddeatil/:slug',
                authenticate: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/carddetail/views/carddetail.html",
                        controller: "carddetailCtrl",
                        controllerAs: 'CDC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Payment'
                    }
                },
                resolve: {
                    CarddetailResolve: function (CarddetailService, $stateParams) {
                        return CarddetailService.gettaskbyid($stateParams.slug);
                    },
                    CurrentUserResolve: function (MainService, AuthenticationService) {
                        var user = AuthenticationService.GetCredentials();
                        if (user.currentUser.user_id) {
                            return MainService.getCurrentUsers(user.currentUser.user_id);
                        }
                    }
                }
            })
            .state('paymentsuccess', {
                url: '/payment-success',
                authenticate: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/carddetail/views/carddetailsuccess.html"
                    }
                },
                data: {
                    meta: {
                        'title': 'Payment'
                    }
                }
            })
            .state('walletsuccess', {
                url: '/wallet-success',
                authenticate: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/carddetail/views/walletsuccess.html"
                    }
                },
                data: {
                    meta: {
                        'title': 'Payment'
                    }
                }
            })
            .state('paymentfailed', {
                url: '/payment-failed/:task',
                authenticate: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/carddetail/views/carddetailfailed.html",
                        controller: "paypalfaileddetailCtrl",
                        controllerAs: 'PPDC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Payment'
                    }
                },
                resolve: {
                    paypaltaskid: function ($stateParams) {
                        return $stateParams;
                    }
                }
            })
            .state('paymentfaileduser', {
                url: '/walletpayment-failed',
                authenticate: true,
                views: {
                    "content": {
                        templateUrl: "app/site/modules/carddetail/views/carddetailfaileduser.html",
                        controller: "paypalfaileddetailCtrl",
                        controllerAs: 'PPDC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Payment'
                    }
                },
                resolve: {
                    paypaltaskid: function ($stateParams) {
                        return $stateParams;
                    }
                }
            })
            .state('Deactivate', {
                //url: '/logout',
                views: {
                    "content": {
                        controller: "DeactivateController",
                        controllerAs: 'DBC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Logout'
                    }
                }
            })

            .state('taskerProfile', {
                url: '/tasker/:taskerId?&user/slug/task',
                views: {
                    content: {
                        templateUrl: "app/site/modules/task-step/views/tasker_profile.html",
                        controller: "taskProfileCtrl",
                        controllerAs: 'TPC'
                    }
                },
                data: {
                    meta: {
                        'title': 'Tasker Details'
                    }
                },
                resolve: {
                    TaskProfileResolve: function (TaskService, $stateParams) {
                        return TaskService.taskprofileinfo($stateParams.taskerId);
                    }
                }
            })
    }])
    .controller('rootCtrl', function (config, $window, $scope, $rootScope, $state, AuthenticationService, MainService, socket, notify, $translate, toastr, $cookieStore, ngMeta, $sce) {

        var rc = this;
        var results = config;

        rc.title = results.response.settings.site_title;
        rc.getsetting = results.response.settings;
        rc.getsetting.logos = { light: rc.getsetting.light_logo, dark: rc.getsetting.logo };
        $rootScope.settings = results.response.settings;
        $rootScope.siteurl = results.response.settings.site_url;
        $rootScope.site_address = results.response.settings.location;
        //$rootScope.tasker = results.response[0].tasker;
        //$rootScope.user = rc.user = results.response[0].user;
        $scope.cashOption = rc.getsetting.pay_by_cash.status;
        rc.favicon = results.response.settings.site_url + results.response.settings.favicon;
        $rootScope.googleMapAPI = results.response.settings.map_api;

        MainService.getpaymentMethod().then(function (response) {
            $scope.payment_method = response;
        });

        ngMeta.setDefaultTag('title', results.response.seo.seo_title);
        ngMeta.setDefaultTag('titleSuffix', ' | ' + rc.title);
        ngMeta.setDefaultTag('keyword', results.response.seo.focus_keyword);
        ngMeta.setDefaultTag('description', results.response.seo.meta_description);

        rc.socialNetworks = results.response.social;
        rc.language = results.response.languages;
        rc.signupimg = results.response.images[0];
        rc.loginimage = results.response.images[3];
        rc.bgimage = results.response.images[1];
        rc.tpimg = results.response.images[4];
        rc.Currency = results.response.currencies;
        rc.sociallinks = results.response.social[0];
        rc.pages = results.response.pages;
        rc.pagescount = results.response.pages.length;

        rc.social = [];
        rc.appstore = [];

        rc.sociallinks.settings.link.filter(function (data) {
            if (data.status == 1) {
                rc.social.push(data);
            }
        });
        rc.sociallinks.settings.mobileapp.filter(function (data) {
            if (data.status == 1) {
                rc.appstore.push(data);
            }
        });
        rc.copyrightYear = new Date();

        $scope.date = {
            'format': results.response.settings.date_format + ' ' + results.response.settings.time_format,
            'timezone': results.response.settings.time_zone,
            'date_format': results.response.settings.time_format,
            'time_format': results.response.settings.time_format
        };

        $rootScope.currency = rc.Currency.filter(function (currency) { return currency.default == 1 })[0];
        if ($cookieStore.get('Currency')) {
            rc.DefaultCurrency = $cookieStore.get('Currency');
            $scope.DefaultCurrency = $cookieStore.get('Currency');
            $rootScope.currency = $cookieStore.get('Currency');
        } else {
            rc.DefaultCurrency = $rootScope.currency;
            $scope.DefaultCurrency = $rootScope.currency;
        }

        if (results.response.user) {
            $rootScope.currAccAvatar = results.response.user.avatar || '/uploads/default/user.jpg';
        }

        rc.logout = function logout() {
            swal({
                title: 'Are you sure?',
                text: 'You will be logout from this session!',
                type: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, Log Out!'
            }).then(function (response) {
                var user = AuthenticationService.GetCredentials();
                AuthenticationService.Logout(user).then(function (data) {
                    AuthenticationService.ClearCredentials();
                    $translate('SUCCESSFULLY_LOGED_OFF').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                    $state.go('landing', {}, { reload: true });
                });
            }).catch(function (err) {

            });
        };

        rc.setDefaultCurrency = function setDefaultCurrency(data) {
            MainService.getDefaultCurrency(data).then(function (response) {
                rc.DefaultCurrency = response[0];
                $scope.DefaultCurrency = response[0];
                $cookieStore.put('Currency', response[0]);
                document.body.scrollTop = document.documentElement.scrollTop = 0;
            });
        };

        rc.subscription = function subscription(subscriptionForm, data) {
            function clearSubscribe() {
                subscriptionForm.$setPristine();
                subscriptionForm.$setUntouched();
                subscriptionForm.email.$setValidity();
                subscriptionForm.email.$setDirty();
                subscriptionForm.email.$pattern();
            }

            if (data) {
                return (MainService.subscription(data).then(function (response) {
                    $translate('SUBSCRIBED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                    clearSubscribe();
                }, function (error) {
                    $translate('EMAIL ALREADY SUBSCRIBED').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    clearSubscribe();
                }));
            } else {
                $translate('INVALID EMAIL').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            }
        };

        rc.otpverifications = function otpverifications(data) {
            if (!data) {
                $translate('ENTER USER NAME').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            } else {
                MainService.otpverifications(data).then(function (response) {
                    console.log("responseresponseresponseresponse", response)
                    rc.userdata = response;
                    if (data == rc.userdata.email || data == rc.userdata.phone.number) {
                        $state.go('signupotp', { 'id': rc.userdata._id }, { reload: false });
                    } else {
                        $translate('USERNAME ALREADY ACTIVATED').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    }
                }, function (err) {
                    $translate(err.data.message).then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });

                });
            }
        };

        MainService.getDefaultLanguage().then(function (response) {
            if ($cookieStore.get('language')) {
                rc.language_code = $cookieStore.get('language_code');
                rc.DefaultLanguage = $cookieStore.get('language');
                $rootScope.language = $cookieStore.get('language');
                //$translate.proposedLanguage(rc.language_code) ||
                $translate.use(rc.language_code);
            } else {
                rc.DefaultLanguage = response[0].name
                $rootScope.language = response[0].name;
                //$translate.proposedLanguage(response[0].code) ||
                $translate.use(response[0].code);
            }
        });

        rc.setDefaultLanguage = function setDefaultLanguage(data) {
            MainService.getDefaultLanguage(data).then(function (response) {
                $cookieStore.put('language', response[0].name);
                $rootScope.language = response[0].name;
                $cookieStore.put('language_code', response[0].code);
                //$translate.proposedLanguage(response[0].code) ||
                $translate.use(response[0].code);
                //language
                if (rc.DefaultLanguage) {
                    if($rootScope.pageId){
                        MainService.getTransalatePage($rootScope.pageId, rc.DefaultLanguage).then(function (response) {
                            if (response.length != 0) {
                                $scope.html = response[0].description;
                                $rootScope.trustedHtml = $sce.trustAsHtml($scope.html);
                            } else {
                                $rootScope.translatepage = "Translate language is not available";
                            }

                        });
                    }
                    MainService.getTransalatePageNames(rc.DefaultLanguage).then(function (response) {
                        var translatepages = response;
                        var matchid;
                        angular.forEach(rc.pages[0].categoryname, function (data, key) {
                            angular.forEach(translatepages, function (data1) {
                                if (data.parent) {
                                    currentid = data.parent;
                                } else {
                                    currentid = data._id;
                                }
                                if (data1.parent) {
                                    matchid = data1.parent;
                                } else {
                                    matchid = data1._id;
                                }
                                if (currentid == matchid) {
                                    rc.pages[0].categoryname[key] = data1;
                                }
                            });
                        });
                        angular.forEach(rc.pages[1].categoryname, function (data, key) {
                            angular.forEach(translatepages, function (data1) {
                                if (data1.parent) {
                                    matchid = data1.parent;
                                } else {
                                    matchid = data1._id;
                                }
                                if (data._id == matchid) {
                                    rc.pages[1].categoryname[key] = data1;
                                }
                            });
                        });
                    });
                }
            });
        };

        $rootScope.$on('notification', function (event, data) {
            //console.log("ddaatttaaa",data)
            AuthenticationService.currentmsgcount(data).then(function (response) {
                $scope.chatCount = response;
            });
        });

        $rootScope.$on('webNotification', function (event, data) {
            MainService.getNotificationsCount(data).then(function (response) {
                $scope.notifyCount = response;
            });
        });

        $rootScope.$on('unreadmsg', function (event, data) {
            AuthenticationService.unreadmsg(data).then(function (response) {
                $scope.unreadmsgs = response;
            });
        });

        $scope.currentUserCredentials = AuthenticationService.GetCredentials();

        if ($scope.currentUserCredentials == '' || Object.keys($scope.currentUserCredentials).length == 0) {
            $rootScope.userId = '';
            $rootScope.username = '';
            $rootScope.usertype = '';
            $rootScope.taskerStatus = '';
        } else {
            $rootScope.userId = $scope.currentUserCredentials.currentUser.user_id;
            $rootScope.username = rc.username = $scope.currentUserCredentials.currentUser.username;
            $rootScope.usertype = $scope.currentUserCredentials.currentUser.user_type;
            $rootScope.taskerStatus = $scope.currentUserCredentials.currentUser.tasker_status;
            $rootScope.currAccAvatar = $scope.currentUserCredentials.currentUser.avatar || '/uploads/default/user.jpg';

            if($rootScope.taskerStatus == 1) {
                $rootScope.showAlert = false;
            } else {
                $rootScope.showAlert = true;
            }

            socket.emit('create room', { user: $rootScope.userId });
            notify.emit('join network', { user: $rootScope.userId });
            $rootScope.$emit('notification', { user: $rootScope.userId, type: $rootScope.usertype });
            $rootScope.$emit('webNotification', { user: $rootScope.userId, type: $rootScope.usertype });
            $rootScope.$emit('unreadmsg', { user: $rootScope.userId, type: $rootScope.usertype });
        }

        $scope.tinymceOptions = {
            plugins: 'link image code',
            toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | code'
        };

        //--------------------- Socket ---------------------

        socket.on('roomcreated', function (data) {
            $scope.socket = data;
        });

        socket.on('webupdatechat', function (data) {

            if ($state.current.name != 'chat') {
                $rootScope.$emit('notification', { user: $rootScope.userId, type: $rootScope.usertype });
                if (data.receiver == $rootScope.userId) {
                    toastr.info("Message Received", 'Notification');
                }
            }
        });

        notify.on('network created', function (data) {
            $scope.socket = data;
        });

        notify.on('web notification', function (data) {
            if(data.message.action == 'account_status') {
                var value = $rootScope.siteglobals;
                if(data.message.message == 'Your account status is changed to Verified') {
                    value.currentUser.tasker_status = 1;
                } else if (data.message.message == 'Your account status is changed to Unverified') {
                    value.currentUser.tasker_status = 2;
                } else {
                    value.currentUser.tasker_status = 3;
                }
                $cookieStore.put('siteglobals', value);
            }

            $rootScope.$emit('webNotification', { user: $rootScope.userId, type: $rootScope.usertype });
            toastr.info(data.message.message, 'Notification');
        });


        // --------------------- Alert ---------------------
        $scope.alerts = [];
        $scope.alertTimeout = 5000;
        $scope.addAlert = function (type, msg) {
            var alert = {};
            alert.type = type;
            alert.msg = msg;
            $scope.alerts.push(alert);
        };
        $scope.closeAlert = function (index) {
            $scope.alerts.splice(index, 1);
        }
        // --------------------- /Alert ---------------------

        $rootScope.$on('eventName', function (event, args) {
            $scope.currentUserCredentials = AuthenticationService.GetCredentials();
            $scope.cartcount = args.count;
            $rootScope.currAccAvatar = (args.avatar || args.avatar != undefined) ? args.avatar : '/uploads/default/user.jpg';
            // if (args.avatar || args.avatar != undefined) {
            //     console.log("undefined");
            // }

            if ($scope.currentUserCredentials == '' || Object.keys($scope.currentUserCredentials).length == 0) {
                $rootScope.userId = '';
                $rootScope.username = '';
                $rootScope.usertype = '';
                $rootScope.taskerStatus = '';
                $rootScope.currAccAvatar ='';
            } else {
                console.log($scope.currentUserCredentials.currentUser);

                $rootScope.userId = $scope.currentUserCredentials.currentUser.user_id;
                $rootScope.username = $scope.currentUserCredentials.currentUser.username;
                $rootScope.usertype = $scope.currentUserCredentials.currentUser.user_type;
                $rootScope.taskerStatus = $scope.currentUserCredentials.currentUser.tasker_status;
                $rootScope.currAccAvatar = $scope.currentUserCredentials.currentUser.avatar;
                //$rootScope.currAccAvatar = $scope.currentUserCredentials.currentUser.avatar || '/uploads/default/user.jpg';
            }
        });
    })
    .controller('taskinfoCtrl', function ($scope, $uibModal, $filter) {
        var tic = this;

        tic.workingDays = [{ day: "Sunday", fromTime: 0, toTime: 0, wholeDay: false }, { day: "Monday", fromTime: 0, toTime: 0, wholeDay: false }, { day: "Tuesday", fromTime: 0, toTime: 0, wholeDay: false }, { day: "Wednesday", fromTime: 0, toTime: 0, wholeDay: false }, { day: "Thursday", fromTime: 0, toTime: 0, wholeDay: false }, { day: "Friday", fromTime: 0, toTime: 0, wholeDay: false }, { day: "Saturday", fromTime: 0, toTime: 0, wholeDay: false }];

        tic.addTaskerAvailability = function (workingdays) {
            tic.taskerAvailabilityData = [];
            angular.forEach(workingdays, function (days) {
                if (days.selected) {
                    tic.taskerAvailabilityData.push({ 'day': days.day, 'from': $filter('date')(days.fromTime, "hh:mm:a"), 'to': $filter('date')(days.toTime, "hh:mm:a"), 'wholeDay': days.wholeDay });
                }
            });
            console.log("tic.taskerAvailabilityData", tic.taskerAvailabilityData);
        };


        tic.checkboxClick = function (group, $event) {
            $event.stopPropagation();
        }

        $scope.addCategory = function (category) {
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'app/site/modules/tasker/views/addcategory.html',
                windowClass: "addcatpop"
                // controller: 'AddcatCtrlpopup',
                // controllerAs: 'ACP'
            });
        };
        $scope.Thankpop = function (category) {
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: 'app/site/modules/tasker/views/thankpop.html',
                windowClass: "thankpop"
                // controller: 'AddcatCtrlpopup',
                // controllerAs: 'ACP'
            });
        };
    })
    .controller('MainCtrl', function ($scope, $location, $rootScope, $http, toastr, MainserviceResolve, MainService, $state, $translate, $cookieStore, swal, AuthenticationService, $cookieStore, ngMeta) {

        var mac = this;
        mac.myInterval = 9000;
        mac.data = MainserviceResolve;
        mac.postheader = mac.data.response[1].PostHeader;
        mac.paymentprice = mac.data.response[5].Paymentprice;
        mac.peoplecomment = mac.data.response[6].Peoplecomment;
        mac.banner = mac.data.response[3].Banner;
        mac.lan_backgroundimg = mac.banner[0].image;
        mac.lan_bannername = mac.banner[0].name;
        mac.lan_bannerdes = mac.banner[0].description;
        mac.site_title = mac.data.response[2].Settings[1].settings.seo_title;

        ngMeta.setTitle(mac.site_title);

        //mac.userdata = AuthenticationService.GetCredentials();

        $scope.getLocation = function getLocation(data) {
            return (MainService.searchSuggestions(data).then(function (response) {
                return response;
            }, function (error) {
                return error;
            }));
        }

        mac.subscription = function subscription(subscriptionForm, data) {
            function clearSubscribe() {
                mac.email = "";
                subscriptionForm.$setPristine();
                subscriptionForm.$setUntouched();
                subscriptionForm.email.$setValidity();
                subscriptionForm.email.$setDirty();
                subscriptionForm.email.$pattern();
            }

            if (data) {
                return (MainService.subscription(data).then(function (response) {
                    $translate('SUBSCRIBED SUCCESSFULLY').then(function (headline) { toastr.success(headline); }, function (headline) { toastr.success(headline); });
                    clearSubscribe();
                }, function (error) {
                    $translate('EMAIL ALREADY SUBSCRIBED').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                    clearSubscribe();
                }));
            } else {
                $translate('INVALID EMAIL').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            }
        };

        $scope.searchData = {};
        if ($rootScope.selectedCategory) {
            $scope.searchData.parent = $rootScope.selectedCategory.parent;
            $scope.searchData.child = $rootScope.selectedCategory.child
        }

        mac.getsubcategory = function (parentid) {
            return (MainService.getsubcategory(parentid).then(function (response) {
                $scope.searchData.child = null;
                mac.subcategorydata = response;
                return response;
            }, function (error) {
                return error;
            }));
        };

        mac.onfocusSubCat = function () {
            if ($scope.searchData.parent) {
                if (!mac.subcategorydata[0]) {
                    $translate('NO SUB CATEGORY FOUND FOR THIS CATEGORY').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
                }
            } else {
                $scope.$broadcast('UiSelectParentCategory');
                $translate('PLEASE CHOOSE A CATEGORY').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            }
        };

        $scope.changeparent = function childSuggestions(data) {
            return (MainService.searchchildSuggestions(data).then(function (response) {
                $scope.childcat = response;
            }, function (error) {
                return error;
            }));
        }

        $scope.search = function search(data) {
            var ca = $cookieStore.get('text');
            $rootScope.selectedCategory = data; // Store data for history
            if (ca) {
                $cookieStore.remove('text');
            }
            if (data.parent) {

                $cookieStore.remove('task_details');
                if (data.child) {
                    $state.go('hirestep1', { 'slug': data.child.slug });
                } else {
                    $state.go('category', { 'slug': data.parent.slug });
                }
            } else {
                $translate('PLEASE CHOOSE A CATEGORY').then(function (headline) { toastr.error(headline); }, function (headline) { toastr.error(headline); });
            }
        }
    })
    .controller('tskheadprofCtrl', function ($scope) {
        $scope.shownav = function () {
            $scope.shwnav = true;
        }
    })
    .controller('MorecategoryCtrl', function (MorecategoryserviceResolve) {
        var moc = this;
        moc.count = 4;
        moc.data = MorecategoryserviceResolve;
    })
    .controller('DatepickerDemoCtrl', function ($scope) {
        $scope.today = function () {
            $scope.dt = new Date();
        };

        $scope.today();

        $scope.clear = function () {
            $scope.dt = null;
        };

        // Disable weekend selection
        $scope.disabled = function (date, mode) {
            return (mode === 'day' && (date.getDay() === 0 || date.getDay() === 6));
        };

        $scope.toggleMin = function () {
            $scope.minDate = $scope.minDate ? null : new Date();
        };
        $scope.toggleMin();

        $scope.open = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1,
            'class': 'datepicker'
        };

        $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];

        $scope.format = $scope.formats[0];
    })
    .controller('SlickController', function ($scope, $rootScope, $timeout) {

        $scope.slickbrand = {
            method: {},
            dots: false,
            infinite: false,
            slidesToShow: 3,
            slidesToScroll: 1,
            speed: 300,
            responsive: [{
                breakpoint: 1024,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                    infinite: true,
                    dots: true
                }
            },
            {
                breakpoint: 1023,
                settings: {
                    slidesToShow: 2,
                    slidesToScroll: 2
                }
            },
            {
                breakpoint: 767,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1
                }
            }
            ]
        };

        $timeout(function () {
            $rootScope.viewLoaded = true;
        });

    })

    .controller('DatepickerDobCtrl', function ($scope) {
        $scope.today = function () {
            $scope.dt = new Date();
        };

        $scope.today();

        // Disable weekend selection
        $scope.disabled = function (date, mode) {
            return (mode === 'day' && (date.getDay() === 0 || date.getDay() === 6));
        };

        $scope.toggleMin = function () {
            $scope.minDate = $scope.minDate ? null : new Date(1945, 1, 1);
        };
        $scope.toggleMin();

        $scope.open = function ($event) {
            $event.preventDefault();
            $event.stopPropagation();

            $scope.opened = true;
        };

        $scope.dateOptions = {
            formatYear: 'yy',
            startingDay: 1,
            'class': 'datepicker'
        };

        $scope.formats = ['dd-MM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];

        $scope.format = $scope.formats[0];
    })
    .filter('clock', function () {
        return function (timestamp, date) {
            return moment.tz(timestamp, date.timezone).format(date.format);
        }
    })
    .filter('money', ['$filter', function (filter) {
        var currencyFilter = filter('currency');
        return function (amount, data) {
            var calAmount = amount * data.value;
            var fractionSize = 2;
            return currencyFilter(calAmount, data.symbol + ' ', fractionSize);
        }
    }])
    .filter('clocksettings', function () {
        return function (timestamp, format, timezone) {
            return moment.tz(timestamp, timezone).format(format);
        }
    })
    .directive('submitValidate', function () {
        return {
            require: 'form',
            restrict: 'A',
            link: function (scope, element, attributes) {
                var $element = angular.element(element);
                $element.on('submit', function (e) {
                    $element.find('.ng-pristine').removeClass('ng-pristine').addClass('ng-dirty');
                    var form = scope[attributes.name];
                    angular.forEach(form, function (formElement, fieldName) {
                        if (fieldName[0] === '$') {
                            return;
                        }
                        formElement.$pristine = false;
                        formElement.$dirty = true;
                    }, this);
                    form.$setDirty();
                    scope.$apply();
                });
            }
        };
    })
    .directive('taskAction', function () {
        return {
            restrict: 'EA',
            link: function (scope, element, attributes) {
                var $element = angular.element(element);
                $element.on('click', function (e) {
                    $('.action-space').not($element.parents('.slidetd').find('.action-space')).hide().removeClass('clickd');
                    if (!$element.parents('.slidetd').find('.action-space').hasClass('clickd')) {
                        $element.parents('.slidetd').find('.action-space').show().addClass('clickd');
                    } else {
                        $element.parents('.slidetd').find('.action-space').hide().removeClass('clickd');
                    }
                    e.preventDefault();
                });
            }
        };
    })
    .directive('stringToNumber', function () {
        return {
            require: 'ngModel',
            link: function (scope, element, attrs, ngModel) {
                ngModel.$parsers.push(function (value) {
                    return '' + value;
                });
                ngModel.$formatters.push(function (value) {
                    if (value) {
                        return parseFloat(value.replace(',', ''));
                    }
                });
            }
        };
    })
    .directive('errSrc', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                var defaultImg = (attrs.errSrc == 'user') ? "uploads/default/user.jpg" : "uploads/default/noimage.jpg";
                if (!attrs.ngSrc) {
                    attrs.$set('src', defaultImg);
                }
                element.bind('error', function () {
                    if (attrs.src != attrs.errSrc) {
                        attrs.errSrc = defaultImg;
                        attrs.$set('src', attrs.errSrc);
                    }
                });
            }
        }
    })
    .directive('checkFileSize', function () {
        return {
            link: function (scope, elem, attr, ctrl) {
                $(elem).bind('change', function () {
                    //alert('File size:' + this.files[0].size);
                });
            }
        }
    })
    .filter('encodeURIComponent', function ($window) {
        return $window.encodeURIComponent;
    })
    .filter('decodeURIComponent', function ($window) {
        return $window.decodeURIComponent;
    })
    .directive('numbersOnly', function () {
        return {
            require: 'ngModel',
            link: function (scope, element, attr, ngModelCtrl) {
                function fromUser(text) {
                    if (text) {
                        var transformedInput = text.replace(/[^0-9]/g, '');
                        if (transformedInput !== text) {
                            ngModelCtrl.$setViewValue(transformedInput);
                            ngModelCtrl.$render();
                        }
                        return transformedInput;
                    }
                    return undefined;
                }
                ngModelCtrl.$parsers.push(fromUser);
            }
        };
    })
    .directive('allowOnlyNumbers', function () {
        return {
            restrict: 'A',
            link: function (scope, elm, attrs, ctrl) {
                elm.on('keydown', function (event) {
                    if (event.which == 64 || event.which == 16) {
                        // to allow numbers
                        return false;
                    } else if (event.which >= 48 && event.which <= 57) {
                        // to allow numbers
                        return true;
                    } else if (event.which >= 96 && event.which <= 105) {
                        // to allow numpad number
                        return true;
                    } else if ([8, 13, 27, 37, 38, 39, 40, 9, 190, 110].indexOf(event.which) > -1) {
                        // to allow backspace, enter, escape, arrows
                        return true;
                    } else {
                        event.preventDefault();
                        // to stop others
                        return false;
                    }
                });
            }
        }
    })
    .directive('scroll', function ($timeout) {
        return {
            restrict: 'A',
            link: function (scope, element, attr) {
                scope.$watchCollection(attr.scroll, function (newVal) {
                    $timeout(function () {
                        element[0].scrollTop = element[0].scrollHeight;
                    });
                });
            }
        }
    })
    .directive('logo', function ($window) {
        return {
            restrict: 'E',
            template: "<img style='width: auto;max-height: 45px;' src='{{default}}' class='mob-lg'>",
            scope: {
                logos: "=images",
                view: "=view"
            },
            controller: function ($scope) {
                $scope.$watch('view', function (newview, oldview) {
                    if (newview == 'landing') {
                        $scope.default = $scope.logos.light;
                        angular.element($window).bind("scroll", function (event) {
                            if (this.pageYOffset > 100) {
                                $scope.default = $scope.logos.dark;
                            } else {
                                $scope.default = $scope.logos.light;
                            }
                            $('.handy-home-header .navbar').toggleClass("fixed", (this.pageYOffset > 100));
                            $scope.$apply();
                        });
                    } else {
                        angular.element($window).off("scroll");
                        $scope.default = $scope.logos.dark;
                    }
                }, true);
            }
        };
    })
    .directive('lazyerr', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                return attrs.$observe("afklLazyImageLoaded", function (value) { });
            }
        };
    })
    .directive('tooltip', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attrs) {
                $(element).hover(function () {
                    // on mouseenter
                    //    $(element).tooltip('show');
                }, function () {
                    // on mouseleave
                    //    $(element).tooltip('hide');
                });
            }
        };
    })
    .directive('disallowSpaces', function () {
        return {
            restrict: 'A',
            link: function ($scope, $element) {
                $element.bind('input', function () {
                    $(this).val($(this).val().replace(/ /g, ''));
                });
            }
        };
    })
    .directive('backButton', ['$window', function ($window) {
        return {
            restrict: 'A',
            link: function (scope, elem, attrs) {
                elem.bind('click', function () {
                    $window.history.back();
                });
            }
        };
    }]);