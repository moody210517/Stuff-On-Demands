jQuery(function () {
    jQuery.validator.addMethod("intlTelNumber", function (phonenumber, element) {
        console.log("phonenumber, element", phonenumber, element);
        // if (0 <= phonenumber.length) {
        //     return true;
        // } else {
        //     return false;
        // }
        return this.optional(element) || $(element).intlTelInput("isValidNumber");
        //return this.optional(element) || $(element).intlTelInput("isValidNumber");
    }, "Please enter a valid  Phone Number");


    $("#step1").validate({
        rules: {
            // firstname: "required",
            // lastname: "required",
            username: {
                required: true,
                namecheck: true,
                minlength: 4,
                maxlength: 20
            },
            email: {
                required: true,
                email: true
            },

            phonenumber: {
                required: true,
                phonecheck: true,
                intlTelNumber: true

            },

            // gender: "required",

            password: {
                required: true,
                pwcheck: true,
                minlength: 6,
                maxlength: 12
            },
            // confirmpassword: {
                // required: true,
                // minlength: 6,
                // maxlength: 12,
                // equalTo: "#password"
            // },

            terms: "required",
        },
        messages: {
            // firstname: "Please enter your firstname",
            // lastname: "Please enter your lastname",
            username: {
                required: "Please enter your username",
                //namecheck: "Special symbols/Spaces are not allowed.!",
                namecheck: "Special symbols/Spaces are not allowed.!",
                minlength: "Username must be at least 4 characters long",
                maxlength: "Username must be maximum of 20 characters"
            },
            email: {
                required: "Please enter a email address",
                email: "Please enter a valid email address"
            },
            phonenumber: {
                required: "Please enter your phone number",
                intlTelNumber: "Please enter a valid  Phone Number",
                phonecheck: "Your phone number must be in numeric only"
            },
            //   gender: "Please select a valid gender",

            password: {
                required: "Please provide a password",
                pwcheck: "Password Must Contain Atleast One uppercase,One lower case,One Numeric digit",
                minlength: "Your password must be at least 6 characters long",
                maxlength: "Password must be maximum of 12 characters"
            },
            // confirmpassword: {
                // required: "Please provide a confirm password",
                // minlength: "Your password must be at least 6 characters long",
                // equalTo: "Please enter the same password as above",
                // maxlength: "Password must be maximum of 12 characters"
            // },

            terms: "Please accept our policy"
        }

    });

    $("#step2").validate({
        rules: {
            example4: "required",
            address: "required",
            // unitnumber: "required",
            zipcode: "required"
        },
        messages: {
            example4: "Please enter your dob",
            //dateofb: "Please enter your dob",
            //unitnumber: "Please enter your house/apartment no",
            zipcode: "Please enter zipcode",
            address: "Please enter address"
        }
    });

    $("#step4").validate({
        rules: {
            locationTextField: "required",
            //   radius: "required",
            reds: "required",
            radius: {
                required: true,
                radiuscheck: true
            },
        },
        messages: {
            locationTextField: "Please enter your location",
            // radius: "Please enter your radius",
            reds: "Please enter your ",
            radius: {
                required: "Please enter your radius",
                radiuscheck: "Your radius must be in numeric only"
            },
        }
    });

    $("#step6").validate({
        rules: {
            erer: "required",


        },
        messages: {
            erer: "Please enter your something",
        }
    });

    $(function () {
        $("#example4").dateDropdowns({
            submitFieldName: 'example4',
            minAge: 18
        });
    });

    //$("#phone").intlTelInput({ "separateDialCode ": true, preferredCountries: ['us', 'in'], });

    $("#phone").intlTelInput({
        separateDialCode: true,
        initialCountry: "auto",
        geoIpLookup: function (callback) {
            $.get('//ipinfo.io', function () { }, "jsonp").always(function (resp) {
                var countryCode = (resp && resp.country) ? resp.country : "";
                callback(countryCode);
            });
        },
        //utilsScript: "../../build/js/utils.js" // just for formatting/placeholders etc
    });


    $("#phone").on('input', function () {
        var pcode = '+' + $("#phone").intlTelInput("getSelectedCountryData").dialCode;
        var pnumber = $("#phone").intlTelInput("getNumber");
        pnumber = pnumber.replace(pcode, '');
        if (pcode) {
            $(this).parent().parent().children('#phonecode').val(pcode);
        }
        if (pnumber) {
            $(this).parent().parent().children('#phonenumber').val(pnumber);
        }
    });

    /*   var taskerskills = {};
      $(".catselect").click(function () {
        console.log('catselect');
          $("#finalbtn").prop('disabled', true);
          var catData = {};
          var minAmount = $(this).closest('ul').children('li').children('.hourly_rate').attr("min");
          catData.hour_rate = $(this).closest('ul').children('li').children('.hourly_rate').val();
          if (catData.hour_rate >= minAmount) {
              $(this).closest('.panel-body').addClass("selected");
              $(this).closest('.panel-body').closest('.parentcategory').addClass("selected");
              $('.collapse').collapse('hide')
              $(this).parent().children('.selected').val("1");

              catData.childid = ($(this).closest('ul').children('li').children('.childid').val()).replace(/^"(.*)"$/, '$1');
              catData.categoryid = ($(this).closest('ul').children('li').children('.categoryid').val()).replace(/^"(.*)"$/, '$1');
              catData.quick_pitch = $(this).closest('ul').children('li').children('.hourpitch').val();
              catData.experience = ($(this).closest('ul').children('li').children('.experience').val()).replace(/^"(.*)"$/, '$1');
              catData.status = 1; //2
              taskerskills[catData.childid] = catData;
              $('#selectedcat').val(JSON.stringify(taskerskills));
          }
          $("#finalbtn").prop('disabled', false);
      }); */

    var taskerskills = {};
    $(".catselect").click(function () {
        $("#finalbtn").prop('disabled', false);
        var catData = {};
        var picth = $(this).closest('ul').children('li').children('.hourpitch').val();
        var minAmount = $(this).closest('ul').children('li').children('.hourly_rate').attr("min");
        // var flatminAmount = $(this).closest('ul').children('li').children('.hourly_rate').attr("min");
        var flatamount = ($(this).closest('ul').children('li').children('.hourly_rate').val());
        var catamount = parseInt(minAmount);
        // var catflatamount = parseInt(flatminAmount);
        catData.hour_rate = $(this).closest('ul').children('li').children('.hourly_rate').val();
        // catData.flat_rate = $(this).closest('ul').children('li').children('.hourly_rate').val();
        catData.experience = ($(this).closest('ul').children('li').children('.experience').val()).replace(/^"(.*)"$/, '$1');
        var checkamount = parseInt(catData.hour_rate);
        // var checkflatamount = parseInt(catData.flat_rate);
        // if(checkflatamount > 0){
        //     catData.hour_rate = checkflatamount;
        // }
        if (picth != '') {
            if (catData.experience != "Select your experience") {
                if (catData.hour_rate != "") {
                    if ((checkamount >= catamount) ) {
                        if (catData.experience == "Select your experience") {
                            alert("Enter Experience");
                            return false;
                        }
                        else {
                            $(this).closest('.panel-body').addClass("selected");
                            $(this).closest('.panel-body').closest('.parentcategory').addClass("selected");
                            $(this).closest('.collapse').collapse('hide');
                            $(this).parent().children('.selected').val("1");

                            catData.childid = ($(this).closest('ul').children('li').children('.childid').val()).replace(/^"(.*)"$/, '$1');
                            catData.categoryid = ($(this).closest('ul').children('li').children('.categoryid').val()).replace(/^"(.*)"$/, '$1');
                            catData.quick_pitch = $(this).closest('ul').children('li').children('.hourpitch').val();
                            catData.experience = ($(this).closest('ul').children('li').children('.experience').val()).replace(/^"(.*)"$/, '$1');
                            catData.status = 1;

                            taskerskills[catData.childid] = catData;
                            $('#selectedcat').val(JSON.stringify(taskerskills));
                            console.log("taskerskills", taskerskills);
                        }//store array
                    }
                    else {
                        alert("Please Set Rate Greater Than Minimum rate..!");
                        return false;
                    }
                }
                else {
                    alert("Enter Rate");
                    return false;
                }
            } else {
                alert("Please Select Level of Experience..!");
                return false;
            }
        } else {
            alert("Please fill quick Pitch field");
            return false;
        }
        $("#finalbtn").prop('disabled', false);
        return false;
    });


    $("#finalbtn").click(function () {
        /* var sPageURL = window.location.search.substring(1);
         var sURLVariables = sPageURL.split('&');
         for (var i = 0; i < sURLVariables.length; i++) {
             var sParameterName = sURLVariables[i].split('=');
             if (sParameterName[0] == sParam) {
                 return sParameterName[1];
             }
         }
         if (sParameterName[0] != "") {
             var language = sParameterName[1];
             console.log("language", language);
         }*/

        $("#finalbtn").prop('disabled', false);
        $('#selectedcat').val(JSON.stringify(taskerskills));
        var skillscount = Object.keys(taskerskills).length;
        console.log("skillscount", skillscount);

        // if (language == "en") {
        if (taskerskills != undefined && skillscount == 0) {
            alert("Please select atleast one category");
            return false;
        } else if (skillscount != 0) {
            $("#finalbtn").prop('disabled', false);
            return true;
        }
        // } else {
        /* if (taskerskills != undefined && skillscount == 0) {
             alert("يرجى تحديد فئة واحدة على الأقل");
             return false;
         } else if (skillscount != 0) {
             $("#finalbtn").prop('disabled', false);
             return true;
         }
     }*/



    });

    $("ul.nav-tabs a").click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    });

    $.validator.addMethod("pwcheck", function (value) {
        // return /^[A-Za-z0-9\d=!\-@._*]*$/.test(value) // consists of only these
        return /[A-Z]/.test(value) //has a uppercase letter
            && /[a-z]/.test(value) // has a lowercase letter
            && /\d/.test(value) // has a digit
    });
    $.validator.addMethod("namecheck", function (value) {
        // return /^[A-Za-z0-9]*$/.test(value) // consists of only these
        return /^[a-zA-Z0-9\_\. ]*$/.test(value) // consists of only these
    });
    $.validator.addMethod("radiuscheck", function (value) {
        return /^[0-9]*$/.test(value) // consists of only these

    });
    $.validator.addMethod("phonecheck", function (value) {
        return /^[0-9]*$/.test(value) // consists of only these

    });
    $.validator.addMethod("email", function (value) {
        return /^[[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}]*$/.test(value) // consists of only these

    });
});

function registerform() {
    if (document.basicinfo.firstname.value == "") {
        alert("Please provide your name!");
        document.basicinfo.firstname.focus();
        return false;
    }
    return true;
}

/*
function savedata(index) {
    var checkboxval = 0;
    $(".botom-fuls .modal-" + index + " .radio-contr li input[type='checkbox']:checked").each(function () {
        checkboxval++;
    });
    if (checkboxval > 0) {
        $('ul.availblty li:nth-child(' + (parseInt(index) + 1) + ')').addClass("selected");
    } else {
        $('ul.availblty li:nth-child(' + (parseInt(index) + 1) + ')').removeClass("selected");
    }
}
*/

$('.modal ').on('hidden.bs.modal', function (e) {

    var modalid = $(this).attr('id').split("-");
    var index = modalid[1];

    var checkboxval = 0;
    $(".botom-fuls .modal-" + index + " .radio-contr li input[type='checkbox']:checked").each(function () {
        checkboxval++;
    });
    if (checkboxval > 0) {
        $('ul.availblty li:nth-child(' + (parseInt(index) + 1) + ')').addClass("selected");
    } else {
        $('ul.availblty li:nth-child(' + (parseInt(index) + 1) + ')').removeClass("selected");
    }
})
/*
$(function () {
    $(":file").change(function () {
        if (this.files && this.files[0]) {
            $('#loader').show();
            var reader = new FileReader();
            reader.onload = imageIsLoaded;
            reader.readAsDataURL(this.files[0]);
        }
    });
});
*/
function imageIsLoaded(e) {
    $('.main-cropper').croppie('bind', {
        url: e.target.result
    });
    $('#myImg').attr('src', e.target.result);
    $('#loader').hide();
};

function dob() {
    var names = document.forms["basicinfo"]["example4_[day]"].value;
    var month = document.forms["basicinfo"]["example4_[month]"].value;
    var year = document.forms["basicinfo"]["example4_[year]"].value;


    if (names == null || names == "") {
        alert("Please fill date of birth!");
        return false;

    }
    if (month == null || month == "") {
        alert("Please fill month of birth!");
        return false;
    }

    if (year == null || year == "") {
        alert("Please fill year of birth!");
        return false;
    }

    var date = new Date();
    var currentDate = date.getDate();
    var currentMonth = date.getMonth() + 1;
    var conditionyear = date.getFullYear() - 18;
    if (conditionyear == year) {
        if (month <= currentMonth) {
            if (names <= currentDate) {
                return true;
            } else {
                alert("Your age must be above 18!");
                return false;
            }
        } else {
            alert("Your age must be above 18!");
            return false;

        }

    } else if (conditionyear < year) {
        alert("Your age must be above 18!");
        return false;
    } else if (conditionyear > year) {
        return true;
    }

}

/*$(".catselect").click(function () {
    var picth = $(this).closest('ul').children('li').children('.hourpitch').val();
    if (picth === '') {
        alert("Please fill all fields");
        return false;
    }
});*/
/*
var basic = $('.main-cropper').croppie({
    enableExif: true,
    viewport: { width: 250, height: 250 },
    boundary: { width: 300, height: 300 },
    showZoomer: false,
    url: 'uploads/images/users/user.jpg'
});
*/
/*
var imageCrop = false;

function crop() {
    console.log("cropping inside");

    basic.croppie('result', {
        type: 'base64',
        size: { width: 326, height: 326 }
    }).then(function (image) {
        console.log("cropped image", image);
        document.getElementById("image64").value = image;
        $("#myImg").attr('src', image);
        imageCrop = true;

        return true;
    });
}
*/

function validateformsfourth() {
    var daters = document.querySelectorAll('input[type="checkbox"]:checked').length;
    if (daters <= 0) {
        alert("Please select your availability days.!");
        return false;
    }
}
