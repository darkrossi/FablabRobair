/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

function init_size() {
    $("#div_cam3").height($("body").height() * 0.57);
    $("#div_cam3").width($("body").width() * 7 / 12);

    $("#div_touchpad").height($("body").height() * 0.45);
    $("#div_touchpad").width($("body").width() * 0.2);

    $("#div_cam1").height($("#div_cam3").height() / 3);
    $("#div_cam1").width($("#div_cam3").width() / 3);

    $("#div_cam2").height($("#div_cam3").height() / 3);
    $("#div_cam2").width($("#div_cam3").width() / 3);
}

