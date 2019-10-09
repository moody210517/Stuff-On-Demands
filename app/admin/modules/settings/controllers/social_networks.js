angular.module('handyforall.settings').controller('SocialNetworksSettingsCtrl', SocialNetworksSettingsCtrl);
SocialNetworksSettingsCtrl.$inject = ['SocialNetworksSettingsServiceResolve', 'SettingsService', 'toastr'];
function SocialNetworksSettingsCtrl(SocialNetworksSettingsServiceResolve, SettingsService, toastr) {
    var snsc = this;

    /*
        // Get Social Networks Settings
        snsc.SocialNetworksSettings = SocialNetworksSettingsServiceResolve[0];
    
        // Save Social Networks Settings
        snsc.saveSocialNetworksSettings = function saveSocialNetworksSettings(data){
            SettingsService.saveSocialNetworksSettings(data).then(function(response){
                toastr.success('Social Networks Settings Saved Successfully');
            },function(err){
                toastr.error('Sorry, Something went wrong');
            });
        };*/

    snsc.SocialNetworksSettings = {};
    snsc.SocialNetworksSettings.link = [];
    snsc.SocialNetworksSettings.link.facebook = {};
    snsc.SocialNetworksSettings.link.twitter = {};
    snsc.SocialNetworksSettings.link.linkedin = {};
    snsc.SocialNetworksSettings.link.pinterest = {};
    snsc.SocialNetworksSettings.link.youtube = {};
    snsc.SocialNetworksSettings.link.google = {};
    snsc.SocialNetworksSettings.mobileapp = [];
    snsc.SocialNetworksSettings.mobileapp.googleplay = {};
    snsc.SocialNetworksSettings.mobileapp.appstore = {};

    if (SocialNetworksSettingsServiceResolve[0].link[0]) {
        snsc.SocialNetworksSettings.link.facebook.name = SocialNetworksSettingsServiceResolve[0].link[0].name;
        snsc.SocialNetworksSettings.link.facebook.url = SocialNetworksSettingsServiceResolve[0].link[0].url;
        snsc.SocialNetworksSettings.link.facebook.facebookimage = SocialNetworksSettingsServiceResolve[0].link[0].img;
        snsc.SocialNetworksSettings.link.facebook.status = SocialNetworksSettingsServiceResolve[0].link[0].status;
    } else {
        snsc.SocialNetworksSettings.link.facebook.name = "";
        snsc.SocialNetworksSettings.link.facebook.url = "";
        snsc.SocialNetworksSettings.link.facebook.facebookimage = "";
        snsc.SocialNetworksSettings.link.facebook.status = "";
    }

    if (SocialNetworksSettingsServiceResolve[0].link[1]) {
        snsc.SocialNetworksSettings.link.twitter.name = SocialNetworksSettingsServiceResolve[0].link[1].name;
        snsc.SocialNetworksSettings.link.twitter.url = SocialNetworksSettingsServiceResolve[0].link[1].url;
        snsc.SocialNetworksSettings.link.twitter.twitterimage = SocialNetworksSettingsServiceResolve[0].link[1].img;
        snsc.SocialNetworksSettings.link.twitter.status = SocialNetworksSettingsServiceResolve[0].link[1].status;
    } else {
        snsc.SocialNetworksSettings.link.twitter.name = "";
        snsc.SocialNetworksSettings.link.twitter.url = "";
        snsc.SocialNetworksSettings.link.twitter.twitterimage = "";
        snsc.SocialNetworksSettings.link.twitter.status = "";
    }

    if (SocialNetworksSettingsServiceResolve[0].link[2]) {
        snsc.SocialNetworksSettings.link.linkedin.name = SocialNetworksSettingsServiceResolve[0].link[2].name;
        snsc.SocialNetworksSettings.link.linkedin.url = SocialNetworksSettingsServiceResolve[0].link[2].url;
        snsc.SocialNetworksSettings.link.linkedin.linkedinimage = SocialNetworksSettingsServiceResolve[0].link[2].img;
        snsc.SocialNetworksSettings.link.linkedin.status = SocialNetworksSettingsServiceResolve[0].link[2].status;
    } else {
        snsc.SocialNetworksSettings.link.linkedin.name = "";
        snsc.SocialNetworksSettings.link.linkedin.url = "";
        snsc.SocialNetworksSettings.link.linkedin.linkedinimage = "";
        snsc.SocialNetworksSettings.link.linkedin.status = "";
    }
    if (SocialNetworksSettingsServiceResolve[0].link[3]) {
        snsc.SocialNetworksSettings.link.pinterest.name = SocialNetworksSettingsServiceResolve[0].link[3].name;
        snsc.SocialNetworksSettings.link.pinterest.url = SocialNetworksSettingsServiceResolve[0].link[3].url;
        snsc.SocialNetworksSettings.link.pinterest.pinterestimage = SocialNetworksSettingsServiceResolve[0].link[3].img;
        snsc.SocialNetworksSettings.link.pinterest.status = SocialNetworksSettingsServiceResolve[0].link[3].status;
    } else {
        snsc.SocialNetworksSettings.link.pinterest.name = "";
        snsc.SocialNetworksSettings.link.pinterest.url = "";
        snsc.SocialNetworksSettings.link.pinterest.pinterestimage = "";
        snsc.SocialNetworksSettings.link.pinterest.status = "";
    }

    if (SocialNetworksSettingsServiceResolve[0].link[4]) {
        snsc.SocialNetworksSettings.link.youtube.name = SocialNetworksSettingsServiceResolve[0].link[4].name;
        snsc.SocialNetworksSettings.link.youtube.url = SocialNetworksSettingsServiceResolve[0].link[4].url;
        snsc.SocialNetworksSettings.link.youtube.youtubeimage = SocialNetworksSettingsServiceResolve[0].link[4].img;
        snsc.SocialNetworksSettings.link.youtube.status = SocialNetworksSettingsServiceResolve[0].link[4].status;

    } else {
        snsc.SocialNetworksSettings.link.youtube.name = "";
        snsc.SocialNetworksSettings.link.youtube.url = "";
        snsc.SocialNetworksSettings.link.youtube.youtubeimage = "";
        snsc.SocialNetworksSettings.link.youtube.status = "";

    }
    if (SocialNetworksSettingsServiceResolve[0].link[5]) {
        snsc.SocialNetworksSettings.link.google.name = SocialNetworksSettingsServiceResolve[0].link[5].name;
        snsc.SocialNetworksSettings.link.google.url = SocialNetworksSettingsServiceResolve[0].link[5].url;
        snsc.SocialNetworksSettings.link.google.googleimage = SocialNetworksSettingsServiceResolve[0].link[5].img;
        snsc.SocialNetworksSettings.link.google.status = SocialNetworksSettingsServiceResolve[0].link[5].status;
    } else {
        snsc.SocialNetworksSettings.link.google.name = "";
        snsc.SocialNetworksSettings.link.google.url = "";
        snsc.SocialNetworksSettings.link.google.googleimage = "";
        snsc.SocialNetworksSettings.link.google.status = "";
    }

    if (SocialNetworksSettingsServiceResolve[0].mobileapp) {
        snsc.SocialNetworksSettings.mobileapp.googleplay.name = SocialNetworksSettingsServiceResolve[0].mobileapp[0].name;
        snsc.SocialNetworksSettings.mobileapp.googleplay.url = SocialNetworksSettingsServiceResolve[0].mobileapp[0].url;
        snsc.SocialNetworksSettings.mobileapp.googleplay.googleplayimage = SocialNetworksSettingsServiceResolve[0].mobileapp[0].img;
        snsc.SocialNetworksSettings.mobileapp.googleplay.status = SocialNetworksSettingsServiceResolve[0].mobileapp[0].status;
    } else {
        snsc.SocialNetworksSettings.mobileapp.googleplay.name = "";
        snsc.SocialNetworksSettings.mobileapp.googleplay.url = "";
        snsc.SocialNetworksSettings.mobileapp.googleplay.googleplayimage = "";
        snsc.SocialNetworksSettings.mobileapp.googleplay.status = "";
    }

    if (SocialNetworksSettingsServiceResolve[0].mobileapp) {
        snsc.SocialNetworksSettings.mobileapp.appstore.name = SocialNetworksSettingsServiceResolve[0].mobileapp[1].name;
        snsc.SocialNetworksSettings.mobileapp.appstore.url = SocialNetworksSettingsServiceResolve[0].mobileapp[1].url;
        snsc.SocialNetworksSettings.mobileapp.appstore.appstoreimage = SocialNetworksSettingsServiceResolve[0].mobileapp[1].img;
        snsc.SocialNetworksSettings.mobileapp.appstore.status = SocialNetworksSettingsServiceResolve[0].mobileapp[1].status;
    } else {
        snsc.SocialNetworksSettings.mobileapp.appstore.name = "";
        snsc.SocialNetworksSettings.mobileapp.appstore.url = "";
        snsc.SocialNetworksSettings.mobileapp.appstore.appstoreimage = "";
        snsc.SocialNetworksSettings.mobileapp.appstore.status = "";
    }

    snsc.saveSocialNetworksSettings = function saveSocialNetworksSettings(valid, data) {
        if (valid == false) {
            toastr.error("Check the values");
        } else {

            var dataValue = {};
            if (data.link.facebook) {
                dataValue.facebookimage = data.link.facebook.facebookimage;
                dataValue.facebookname = data.link.facebook.name;
                dataValue.facebookurl = data.link.facebook.url;
                dataValue.facebookstatus = data.link.facebook.status;
            }

            if (data.link.twitter) {
                dataValue.twitterimage = data.link.twitter.twitterimage;
                dataValue.twittername = data.link.twitter.name;
                dataValue.twitterurl = data.link.twitter.url;
                dataValue.twitterstatus = data.link.twitter.status;
            }

            if (data.link.linkedin) {
                dataValue.linkedinimage = data.link.linkedin.linkedinimage;
                dataValue.linkedinname = data.link.linkedin.name;
                dataValue.linkedinurl = data.link.linkedin.url;
                dataValue.linkedinstatus = data.link.linkedin.status;
            }

            if (data.link.pinterest) {
                dataValue.pinterestimage = data.link.pinterest.pinterestimage;
                dataValue.pinterestname = data.link.pinterest.name;
                dataValue.pinteresturl = data.link.pinterest.url;
                dataValue.pintereststatus = data.link.pinterest.status;

            }
            if (data.link.youtube) {
                dataValue.youtubeimage = data.link.youtube.youtubeimage;
                dataValue.youtubename = data.link.youtube.name;
                dataValue.youtubeurl = data.link.youtube.url;
                dataValue.youtubestatus = data.link.youtube.status;
            }

            if (data.link.google) {
                dataValue.googleimage = data.link.google.googleimage;
                dataValue.googlename = data.link.google.name;
                dataValue.googleurl = data.link.google.url;
                dataValue.googlestatus = data.link.google.status;
            }

            if (data.mobileapp.googleplay) {
                dataValue.googleplayimage = data.mobileapp.googleplay.googleplayimage;
                dataValue.googleplayname = data.mobileapp.googleplay.name;
                dataValue.googleplayurl = data.mobileapp.googleplay.url;
                dataValue.googleplaystatus = data.mobileapp.googleplay.status;
            }

            if (data.mobileapp.appstore) {
                dataValue.appstoreimage = data.mobileapp.appstore.appstoreimage;
                dataValue.appstorename = data.mobileapp.appstore.name;
                dataValue.appstoreurl = data.mobileapp.appstore.url;
                dataValue.appstorestatus = data.mobileapp.appstore.status;
            }

            SettingsService.saveSocialNetworksSettings(dataValue).then(function (response) {
                toastr.success('Social Networks Settings Saved Successfully');
            }, function (err) {
                toastr.error('Sorry, Something went wrong');
            });
        }


    };

}
