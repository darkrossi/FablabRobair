(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var utils = require('./utils');

/**
 * Gives access to buttons and other DOM elements it also
 * handle some events binding between buttons and calls. This class must be
 * called once the DOM is ready.
 * @constructor
 */
function GUI() {
  var me = this;
  // store reference to buttons and stuff
  /** Object storing references to the connect formulary DOM elements*/
  this.connect = {
    btn: $('#connect-btn'),
    form: $('#connect-form'),
    ip: $('#connect-ip'),
    div: $('#connect'),
    remember: $('#connect-remember'),
  };

  /** Object storing references to the remote screen DOM elements */
  this.remote = {
    div: $('#remote'),
    left: $('#remote-left'),
    right: $('#remote-right'),
    up: $('#remote-up'),
    down: $('#remote-down'),
    move: $('#remote-controls-mouse'),
    stop: $('#remote-stop'),
    img: $('#remote-img'),
    visible: false
  };

}

/**
 * Reset the connect formulary
 */
GUI.prototype.resetConnectForm = function reset() {
  this.connect.ip.prop('disabled', false);
  this.connect.remember.prop('disabled', false);
  this.connect.btn.button('reset');
};
/**
 * Hides the connect formulary
 */
GUI.prototype.hideConnectForm = function hide() {
  this.connect.div.slideUp(500);
};

/**
 * Shows the remote screen view
 */
GUI.prototype.showRemote = function show() {
  this.remote.div.slideDown(500);
  this.remote.visible = true;
};

/**
 * Bind events for the connect formulary
 * @param {RosConnection} rc RosConnection instance
 * @param {Storage} sto Storage instance
 */
GUI.prototype.bindConnect = function bindConnect(rc, sto) {
  // load form data if available
  sto.loadIP();
  var me = this;
  this.connect.form.submit(function(event) {
    event.preventDefault();
    var ip = me.connect.ip.val() || me.connect.ip.attr('placeholder');
    if (utils.isIPValid(ip)) {
      sto.saveIP();
      me.connect.ip.prop('disabled', true);
      me.connect.remember.prop('disabled', true);
      me.connect.btn.button('loading');
      me.connect.btn.text('Connecting');
      rc.connect(ip);
    } else {
      $.bootstrapGrowl('IP is invalid! It should be like 127.0.0.1:9090. Don\'t forget about the port!', {
        type: 'danger',
        width: 'auto'
      });
    }
  });
};

/**
 * Binds events for the remote screen
 * @param {RosConnection} rc RosConnection instance
 * @param {Storage} sto Storage instance
 */
GUI.prototype.bindRemote = function bindRemote(rc, sto) {
  // Add keyboard events
  var me = this;
  var direction = {};
  direction[utils.keys.UP] = 0;
  direction[utils.keys.DOWN] = 1;
  direction[utils.keys.LEFT] = 2;
  direction[utils.keys.RIGHT] = 3;
  direction[utils.keys.SPACE] = 4;
  direction[utils.keys.S] = 4;
  direction[0] = 5;

  var but = {};
  but[utils.keys.UP] = this.remote.up;
  but[utils.keys.DOWN] = this.remote.down;
  but[utils.keys.LEFT] = this.remote.left;
  but[utils.keys.RIGHT] = this.remote.right;
  but[utils.keys.SPACE] = this.remote.stop;
  but[utils.keys.S] = this.remote.stop;
  but[0] = this.remote.move;

  // Give the key pressed. It must be in directions array
  var lastPressed = this.remote.stop; // only one action at a time
  var clickButton = function clickButton(key) {
    console.log("onKeyDown ---> keyCode = " + key);
    if (lastPressed) {
      lastPressed.removeClass('btn-primary');
      if (lastPressed === me.remote.stop) {
        lastPressed.addClass('btn-warning');
      } else {
        lastPressed.addClass('btn-default');
      }
    }
    lastPressed = but[key];
    lastPressed.addClass('btn-primary');
    if (lastPressed !== me.remote.stop) {
      lastPressed.removeClass('btn-default');
    } else {
      lastPressed.removeClass('btn-warning');
    }
    //send command with direction,speed1,turn
    rc.moveRobot(direction[key],0,0);
  };
  // bind keyboard
  document.onkeydown = function keyDown(e) {
    if (!me.remote.move.visible) {
      return;
    }
    e = e || window.event;

    if (e.keyCode in direction) {
      e.preventDefault();
      clickButton(e.keyCode);
    }
  };

  // bind buttons clicks as well
  this.remote.left.click(clickButton.bind(null, utils.keys.LEFT));
  this.remote.right.click(clickButton.bind(null, utils.keys.RIGHT));
  this.remote.up.click(clickButton.bind(null, utils.keys.UP));
  this.remote.down.click(clickButton.bind(null, utils.keys.DOWN));
  this.remote.stop.click(clickButton.bind(null, utils.keys.S));
  
  // Control with mouse motion
  var mouseMotionCtrl = function mouseMotionCtrl(event) {
    var x0 = event.x
    var y0 = event.y

    document.onmousemove = function (event) {
      onselectstart = 'return false';
      dx = (x0 - event.x);
      dy = (y0 - event.y);
      // distance when speed max is reached 
      normX = 200;
      rx1 = (dx + (normX/2))/normX;
      rx2 = 1 - rx1;

      normY = 200;
      dy = (y0-event.y)*normY/255;
      v = dy+128;

      //process speed with ponderation
      speed1 = 2 * v * rx1;
      speed2 = 2 * v * rx2;
      console.log("Debug C dx:" + dx + " dy:" + dy + " rx1:" + rx1 + " rx2:" + rx2 + " speed1:" + speed1 + " speed2:"+speed2);
      if(speed1 > 255) { speed1 = 255;}
      if(speed1 < 0) {speed1 = 0;}
      if(speed2 > 255) {speed2 = 255;}
      if(speed2 < 0) {speed2 = 0;}
      rc.moveRobot(5,Math.round(speed1),Math.round(speed2));
    }
    this.onmouseup = function () {
      document.onmousemove = null;
      rc.moveRobot(4,0,0);
    }
  }
  // bind mouse
  document.onmousedown = function(e) {
    console.log("debug B");
    if (!me.remote.visible) {
      return;
    }
    e = e || window.event;
    mouseMotionCtrl(e);
    console.log('debig');
  };
  /*
  //GAMEPAD
  var haveEvents = 'GamepadEvent' in window;
  var controllers = {};
  var rAF = window.mozRequestAnimationFrame 
  
  
  
  function connecthandler(e){
    //addgamepad(e.gamepad);
    console.log("Controleur id:%d connecte:%s. %d boutons, %d axes.",
    e.gamepad.index,
    e.gamepad.id,
    e.gamepad.buttons.length,
    e.gamepad.axes.length);
  }
  
  function disconnecthandler(e){
    removegamepad(e.gamepad);
  }
  
  function scangamepads(){
   var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);
   for (var i = 0; i < gamepads.length; i++) {
   } 
  }
  
  
  //Remote Control
  window.addEventListener("gamepadconnected",connecthandler);
  window.addEventListener("gamepaddisconnected",disconnecthandler);
  if(!haveEvents) {
    setInterval(scangamepads,500);
  }	
*/
};

module.exports = GUI;

},{"./utils":5}],2:[function(require,module,exports){
/**
 * Grants access to the robot by etablishing a ROS connection
 * @constructor
 * @param {GUI} gui GUI instance
 */
function RosConnection(gui) {
  /** Ros instance */
  this.ros = null;
  /** GUI instance */
  this.gui = gui;
  /** Topic to send movement orders */
  this.moveTopic = null;
  /** Topic to receive ultrasound data */
//  this.ultrasoundTopic = null;
  /** IP and port to connect to */
  this.ip = '';
}

/**
 * Connect to a given IP using a WebSocket
 * @param {string} ip must define the port as well: 127.0.0.1:9090
 */
RosConnection.prototype.connect = function connect(ip) {
  this.ip = ip;
  this.ros = new ROSLIB.Ros({
    url: 'ws://' + ip
  });
  this._createEvents();
  this._createTopics();
};

/**
 * Create events for a ros connection. This must be called just after
 * calling connect
 * @private
 */
RosConnection.prototype._createEvents = function createEvents() {
  var me = this;
  this.ros.on('connection', function(error) {
    $.bootstrapGrowl('Connected to robot at ' + error.currentTarget.url, {
      type: 'success',
      width: 'auto'
    });
    console.log('Connected to websocket server.');
    me.gui.resetConnectForm();
    me.gui.hideConnectForm();
    me.gui.showRemote();

    // change img src
    // XXX PORT need to be dynamically changed
    me.gui.remote.img.prop('src', '//' + me.ip.replace('9090', '3002') + me.gui.remote.img.attr('data-uri'));
  });
  this.ros.on('error', function(error) {
    $.bootstrapGrowl('Error connecting to robot at ' + error.currentTarget.url, {
      type: 'danger',
      width: 'auto'
    });
    console.log('Error connecting to websocket server: ', error);
    me.gui.resetConnectForm();
    // XXX Testing invert comments when done
    //me.gui.resetConnectForm();
    //me.gui.hideConnectForm();
    //me.gui.showRemote();
    //me.gui.remote.img.prop('src', '//' + me.ip.replace('9090', '3002') + me.gui.remote.img.attr('data-uri'));
  });

  this.ros.on('close', function() {
    // TODO call the resets on GUI
    console.log('ROS ws closed.');
  });
};

/**
 * Create topics once the ros connection is etablished. This allows
 * publishing messages.
 * @private
 */
RosConnection.prototype._createTopics = function createTopics() {
  this.moveTopic = new ROSLIB.Topic({
    ros: this.ros,
    //name : '/cmd_vel',
    name: '/cmd',
    messageType: 'robair_demo/Command' //meter un tipo de mensaje valido en el dir '/msg' del package
      //messageType : 'geometry_msgs/Twist'
  });
  //this.ultrasoundTopic = new ROSLIB.Topic({
  //  ros: this.ros,
  //  name: '/sensor/ultrasound_obstacles',
  //  messageType:'std_msgs/Sting'
  //});
};

/**
 * Send a message to move the robot
 * @param {Number} dir Value between 0 and 4. 4 = Stop
 */
RosConnection.prototype.moveRobot = function moveRobot(dir,speed1,turn) {
  var msg = new ROSLIB.Message({
    move: dir, //{"top": 0, "bottom": 1, "left": 2, "right": 3, "s": 4}
    speed1: speed1,
    turn: turn
  });

  //Publish on Topic
  console.log('Sending move command with dir ' + dir);
  this.moveTopic.publish(msg);
};

//RosConnection.prototype.ultrasoundRobot = function ultrasoundRobot() {
//  var msg = new ROSLIB.Message({
    
//  });
//};

module.exports = RosConnection;

},{}],3:[function(require,module,exports){
/**
 * Storage object to store any information needed by two different sessions
 * @constructor
 * @param {GUI} gui GUI instance
 */

function Storage(gui) {
  this.gui = gui;
}

if (typeof(Storage) !== "undefined") {
  /**
   * Saves IP when remember checkbox is checked
   */
  Storage.prototype.saveIP = function() {
    var ip = this.gui.connect.ip.val();
    var remember = this.gui.connect.remember.prop('checked');
    localStorage.setItem('ip', remember ? ip : '');
    localStorage.setItem('remember', remember);
  };

  /**
   * Load a previously saved IP from LocalStorage and change the
   * corresponding input
   */
  Storage.prototype.loadIP = function() {

    var ip = localStorage.getItem('ip');
    var remember = localStorage.getItem('remember');
    this.gui.connect.ip.val(ip);
    this.gui.connect.remember.prop('checked', remember);
  };
} else {
  Storage.prototype.saveIP = function() {};
  Storage.prototype.loadIP = function() {};
}

module.exports = Storage;

},{}],4:[function(require,module,exports){
// include dependencies
var RosConnection = require('./RosConnection');
var GUI = require('./Gui');
var Storage = require('./Storage');

// wait until the dom is ready
$(document).ready(function() {
  // General utilities
  var gui = new GUI();
  var ros = new RosConnection(gui);
  var storage = new Storage(gui);

  gui.bindConnect(ros, storage);
  gui.bindRemote(ros, storage);
});

},{"./Gui":1,"./RosConnection":2,"./Storage":3}],5:[function(require,module,exports){
/**
 * @namespace utils
 * @description Gives some utility functions that do not belong anywhere
 * else in the code
 */
var utils = {
  /**
   * Check if an ip is valid
   * @param {string} ip IP to check against
   * @return {boolean} true if the IP is valid, false otherwhise
   */
  isIPValid: function isIPValid(ip) {
    var tab = ipReg.exec(ip);
    if (!tab) {
      return false;
    }
    return parseInt(tab[4], 10) > 1024;
  },
  /**
   * KeyCodes for better readability
   */
  keys: {
    SPACE: 32,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    S: 83,
  }
};

var ipReg = new RegExp('^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\:([1-9][0-9]*)$');

module.exports = utils;

},{}]},{},[4])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9ob21lL2ZhYmxhYi9yb2JhaXIvd2ViLWludGVyZmFjZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9mYWJsYWIvcm9iYWlyL3dlYi1pbnRlcmZhY2UvanMvR3VpLmpzIiwiL2hvbWUvZmFibGFiL3JvYmFpci93ZWItaW50ZXJmYWNlL2pzL1Jvc0Nvbm5lY3Rpb24uanMiLCIvaG9tZS9mYWJsYWIvcm9iYWlyL3dlYi1pbnRlcmZhY2UvanMvU3RvcmFnZS5qcyIsIi9ob21lL2ZhYmxhYi9yb2JhaXIvd2ViLWludGVyZmFjZS9qcy9mYWtlXzFjYTUwODNjLmpzIiwiL2hvbWUvZmFibGFiL3JvYmFpci93ZWItaW50ZXJmYWNlL2pzL3V0aWxzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcblxuLyoqXG4gKiBHaXZlcyBhY2Nlc3MgdG8gYnV0dG9ucyBhbmQgb3RoZXIgRE9NIGVsZW1lbnRzIGl0IGFsc29cbiAqIGhhbmRsZSBzb21lIGV2ZW50cyBiaW5kaW5nIGJldHdlZW4gYnV0dG9ucyBhbmQgY2FsbHMuIFRoaXMgY2xhc3MgbXVzdCBiZVxuICogY2FsbGVkIG9uY2UgdGhlIERPTSBpcyByZWFkeS5cbiAqIEBjb25zdHJ1Y3RvclxuICovXG5mdW5jdGlvbiBHVUkoKSB7XG4gIHZhciBtZSA9IHRoaXM7XG4gIC8vIHN0b3JlIHJlZmVyZW5jZSB0byBidXR0b25zIGFuZCBzdHVmZlxuICAvKiogT2JqZWN0IHN0b3JpbmcgcmVmZXJlbmNlcyB0byB0aGUgY29ubmVjdCBmb3JtdWxhcnkgRE9NIGVsZW1lbnRzKi9cbiAgdGhpcy5jb25uZWN0ID0ge1xuICAgIGJ0bjogJCgnI2Nvbm5lY3QtYnRuJyksXG4gICAgZm9ybTogJCgnI2Nvbm5lY3QtZm9ybScpLFxuICAgIGlwOiAkKCcjY29ubmVjdC1pcCcpLFxuICAgIGRpdjogJCgnI2Nvbm5lY3QnKSxcbiAgICByZW1lbWJlcjogJCgnI2Nvbm5lY3QtcmVtZW1iZXInKSxcbiAgfTtcblxuICAvKiogT2JqZWN0IHN0b3JpbmcgcmVmZXJlbmNlcyB0byB0aGUgcmVtb3RlIHNjcmVlbiBET00gZWxlbWVudHMgKi9cbiAgdGhpcy5yZW1vdGUgPSB7XG4gICAgZGl2OiAkKCcjcmVtb3RlJyksXG4gICAgbGVmdDogJCgnI3JlbW90ZS1sZWZ0JyksXG4gICAgcmlnaHQ6ICQoJyNyZW1vdGUtcmlnaHQnKSxcbiAgICB1cDogJCgnI3JlbW90ZS11cCcpLFxuICAgIGRvd246ICQoJyNyZW1vdGUtZG93bicpLFxuICAgIG1vdmU6ICQoJyNyZW1vdGUtY29udHJvbHMtbW91c2UnKSxcbiAgICBzdG9wOiAkKCcjcmVtb3RlLXN0b3AnKSxcbiAgICBpbWc6ICQoJyNyZW1vdGUtaW1nJyksXG4gICAgdmlzaWJsZTogZmFsc2VcbiAgfTtcblxufVxuXG4vKipcbiAqIFJlc2V0IHRoZSBjb25uZWN0IGZvcm11bGFyeVxuICovXG5HVUkucHJvdG90eXBlLnJlc2V0Q29ubmVjdEZvcm0gPSBmdW5jdGlvbiByZXNldCgpIHtcbiAgdGhpcy5jb25uZWN0LmlwLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICB0aGlzLmNvbm5lY3QucmVtZW1iZXIucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gIHRoaXMuY29ubmVjdC5idG4uYnV0dG9uKCdyZXNldCcpO1xufTtcbi8qKlxuICogSGlkZXMgdGhlIGNvbm5lY3QgZm9ybXVsYXJ5XG4gKi9cbkdVSS5wcm90b3R5cGUuaGlkZUNvbm5lY3RGb3JtID0gZnVuY3Rpb24gaGlkZSgpIHtcbiAgdGhpcy5jb25uZWN0LmRpdi5zbGlkZVVwKDUwMCk7XG59O1xuXG4vKipcbiAqIFNob3dzIHRoZSByZW1vdGUgc2NyZWVuIHZpZXdcbiAqL1xuR1VJLnByb3RvdHlwZS5zaG93UmVtb3RlID0gZnVuY3Rpb24gc2hvdygpIHtcbiAgdGhpcy5yZW1vdGUuZGl2LnNsaWRlRG93big1MDApO1xuICB0aGlzLnJlbW90ZS52aXNpYmxlID0gdHJ1ZTtcbn07XG5cbi8qKlxuICogQmluZCBldmVudHMgZm9yIHRoZSBjb25uZWN0IGZvcm11bGFyeVxuICogQHBhcmFtIHtSb3NDb25uZWN0aW9ufSByYyBSb3NDb25uZWN0aW9uIGluc3RhbmNlXG4gKiBAcGFyYW0ge1N0b3JhZ2V9IHN0byBTdG9yYWdlIGluc3RhbmNlXG4gKi9cbkdVSS5wcm90b3R5cGUuYmluZENvbm5lY3QgPSBmdW5jdGlvbiBiaW5kQ29ubmVjdChyYywgc3RvKSB7XG4gIC8vIGxvYWQgZm9ybSBkYXRhIGlmIGF2YWlsYWJsZVxuICBzdG8ubG9hZElQKCk7XG4gIHZhciBtZSA9IHRoaXM7XG4gIHRoaXMuY29ubmVjdC5mb3JtLnN1Ym1pdChmdW5jdGlvbihldmVudCkge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdmFyIGlwID0gbWUuY29ubmVjdC5pcC52YWwoKSB8fCBtZS5jb25uZWN0LmlwLmF0dHIoJ3BsYWNlaG9sZGVyJyk7XG4gICAgaWYgKHV0aWxzLmlzSVBWYWxpZChpcCkpIHtcbiAgICAgIHN0by5zYXZlSVAoKTtcbiAgICAgIG1lLmNvbm5lY3QuaXAucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgIG1lLmNvbm5lY3QucmVtZW1iZXIucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcbiAgICAgIG1lLmNvbm5lY3QuYnRuLmJ1dHRvbignbG9hZGluZycpO1xuICAgICAgbWUuY29ubmVjdC5idG4udGV4dCgnQ29ubmVjdGluZycpO1xuICAgICAgcmMuY29ubmVjdChpcCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICQuYm9vdHN0cmFwR3Jvd2woJ0lQIGlzIGludmFsaWQhIEl0IHNob3VsZCBiZSBsaWtlIDEyNy4wLjAuMTo5MDkwLiBEb25cXCd0IGZvcmdldCBhYm91dCB0aGUgcG9ydCEnLCB7XG4gICAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgICB3aWR0aDogJ2F1dG8nXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xufTtcblxuLyoqXG4gKiBCaW5kcyBldmVudHMgZm9yIHRoZSByZW1vdGUgc2NyZWVuXG4gKiBAcGFyYW0ge1Jvc0Nvbm5lY3Rpb259IHJjIFJvc0Nvbm5lY3Rpb24gaW5zdGFuY2VcbiAqIEBwYXJhbSB7U3RvcmFnZX0gc3RvIFN0b3JhZ2UgaW5zdGFuY2VcbiAqL1xuR1VJLnByb3RvdHlwZS5iaW5kUmVtb3RlID0gZnVuY3Rpb24gYmluZFJlbW90ZShyYywgc3RvKSB7XG4gIC8vIEFkZCBrZXlib2FyZCBldmVudHNcbiAgdmFyIG1lID0gdGhpcztcbiAgdmFyIGRpcmVjdGlvbiA9IHt9O1xuICBkaXJlY3Rpb25bdXRpbHMua2V5cy5VUF0gPSAwO1xuICBkaXJlY3Rpb25bdXRpbHMua2V5cy5ET1dOXSA9IDE7XG4gIGRpcmVjdGlvblt1dGlscy5rZXlzLkxFRlRdID0gMjtcbiAgZGlyZWN0aW9uW3V0aWxzLmtleXMuUklHSFRdID0gMztcbiAgZGlyZWN0aW9uW3V0aWxzLmtleXMuU1BBQ0VdID0gNDtcbiAgZGlyZWN0aW9uW3V0aWxzLmtleXMuU10gPSA0O1xuICBkaXJlY3Rpb25bMF0gPSA1O1xuXG4gIHZhciBidXQgPSB7fTtcbiAgYnV0W3V0aWxzLmtleXMuVVBdID0gdGhpcy5yZW1vdGUudXA7XG4gIGJ1dFt1dGlscy5rZXlzLkRPV05dID0gdGhpcy5yZW1vdGUuZG93bjtcbiAgYnV0W3V0aWxzLmtleXMuTEVGVF0gPSB0aGlzLnJlbW90ZS5sZWZ0O1xuICBidXRbdXRpbHMua2V5cy5SSUdIVF0gPSB0aGlzLnJlbW90ZS5yaWdodDtcbiAgYnV0W3V0aWxzLmtleXMuU1BBQ0VdID0gdGhpcy5yZW1vdGUuc3RvcDtcbiAgYnV0W3V0aWxzLmtleXMuU10gPSB0aGlzLnJlbW90ZS5zdG9wO1xuICBidXRbMF0gPSB0aGlzLnJlbW90ZS5tb3ZlO1xuXG4gIC8vIEdpdmUgdGhlIGtleSBwcmVzc2VkLiBJdCBtdXN0IGJlIGluIGRpcmVjdGlvbnMgYXJyYXlcbiAgdmFyIGxhc3RQcmVzc2VkID0gdGhpcy5yZW1vdGUuc3RvcDsgLy8gb25seSBvbmUgYWN0aW9uIGF0IGEgdGltZVxuICB2YXIgY2xpY2tCdXR0b24gPSBmdW5jdGlvbiBjbGlja0J1dHRvbihrZXkpIHtcbiAgICBjb25zb2xlLmxvZyhcIm9uS2V5RG93biAtLS0+IGtleUNvZGUgPSBcIiArIGtleSk7XG4gICAgaWYgKGxhc3RQcmVzc2VkKSB7XG4gICAgICBsYXN0UHJlc3NlZC5yZW1vdmVDbGFzcygnYnRuLXByaW1hcnknKTtcbiAgICAgIGlmIChsYXN0UHJlc3NlZCA9PT0gbWUucmVtb3RlLnN0b3ApIHtcbiAgICAgICAgbGFzdFByZXNzZWQuYWRkQ2xhc3MoJ2J0bi13YXJuaW5nJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsYXN0UHJlc3NlZC5hZGRDbGFzcygnYnRuLWRlZmF1bHQnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgbGFzdFByZXNzZWQgPSBidXRba2V5XTtcbiAgICBsYXN0UHJlc3NlZC5hZGRDbGFzcygnYnRuLXByaW1hcnknKTtcbiAgICBpZiAobGFzdFByZXNzZWQgIT09IG1lLnJlbW90ZS5zdG9wKSB7XG4gICAgICBsYXN0UHJlc3NlZC5yZW1vdmVDbGFzcygnYnRuLWRlZmF1bHQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGFzdFByZXNzZWQucmVtb3ZlQ2xhc3MoJ2J0bi13YXJuaW5nJyk7XG4gICAgfVxuICAgIC8vc2VuZCBjb21tYW5kIHdpdGggZGlyZWN0aW9uLHNwZWVkMSx0dXJuXG4gICAgcmMubW92ZVJvYm90KGRpcmVjdGlvbltrZXldLDAsMCk7XG4gIH07XG4gIC8vIGJpbmQga2V5Ym9hcmRcbiAgZG9jdW1lbnQub25rZXlkb3duID0gZnVuY3Rpb24ga2V5RG93bihlKSB7XG4gICAgaWYgKCFtZS5yZW1vdGUubW92ZS52aXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcblxuICAgIGlmIChlLmtleUNvZGUgaW4gZGlyZWN0aW9uKSB7XG4gICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBjbGlja0J1dHRvbihlLmtleUNvZGUpO1xuICAgIH1cbiAgfTtcblxuICAvLyBiaW5kIGJ1dHRvbnMgY2xpY2tzIGFzIHdlbGxcbiAgdGhpcy5yZW1vdGUubGVmdC5jbGljayhjbGlja0J1dHRvbi5iaW5kKG51bGwsIHV0aWxzLmtleXMuTEVGVCkpO1xuICB0aGlzLnJlbW90ZS5yaWdodC5jbGljayhjbGlja0J1dHRvbi5iaW5kKG51bGwsIHV0aWxzLmtleXMuUklHSFQpKTtcbiAgdGhpcy5yZW1vdGUudXAuY2xpY2soY2xpY2tCdXR0b24uYmluZChudWxsLCB1dGlscy5rZXlzLlVQKSk7XG4gIHRoaXMucmVtb3RlLmRvd24uY2xpY2soY2xpY2tCdXR0b24uYmluZChudWxsLCB1dGlscy5rZXlzLkRPV04pKTtcbiAgdGhpcy5yZW1vdGUuc3RvcC5jbGljayhjbGlja0J1dHRvbi5iaW5kKG51bGwsIHV0aWxzLmtleXMuUykpO1xuICBcbiAgLy8gQ29udHJvbCB3aXRoIG1vdXNlIG1vdGlvblxuICB2YXIgbW91c2VNb3Rpb25DdHJsID0gZnVuY3Rpb24gbW91c2VNb3Rpb25DdHJsKGV2ZW50KSB7XG4gICAgdmFyIHgwID0gZXZlbnQueFxuICAgIHZhciB5MCA9IGV2ZW50LnlcblxuICAgIGRvY3VtZW50Lm9ubW91c2Vtb3ZlID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICBvbnNlbGVjdHN0YXJ0ID0gJ3JldHVybiBmYWxzZSc7XG4gICAgICBkeCA9ICh4MCAtIGV2ZW50LngpO1xuICAgICAgZHkgPSAoeTAgLSBldmVudC55KTtcbiAgICAgIC8vIGRpc3RhbmNlIHdoZW4gc3BlZWQgbWF4IGlzIHJlYWNoZWQgXG4gICAgICBub3JtWCA9IDIwMDtcbiAgICAgIHJ4MSA9IChkeCArIChub3JtWC8yKSkvbm9ybVg7XG4gICAgICByeDIgPSAxIC0gcngxO1xuXG4gICAgICBub3JtWSA9IDIwMDtcbiAgICAgIGR5ID0gKHkwLWV2ZW50LnkpKm5vcm1ZLzI1NTtcbiAgICAgIHYgPSBkeSsxMjg7XG5cbiAgICAgIC8vcHJvY2VzcyBzcGVlZCB3aXRoIHBvbmRlcmF0aW9uXG4gICAgICBzcGVlZDEgPSAyICogdiAqIHJ4MTtcbiAgICAgIHNwZWVkMiA9IDIgKiB2ICogcngyO1xuICAgICAgY29uc29sZS5sb2coXCJEZWJ1ZyBDIGR4OlwiICsgZHggKyBcIiBkeTpcIiArIGR5ICsgXCIgcngxOlwiICsgcngxICsgXCIgcngyOlwiICsgcngyICsgXCIgc3BlZWQxOlwiICsgc3BlZWQxICsgXCIgc3BlZWQyOlwiK3NwZWVkMik7XG4gICAgICBpZihzcGVlZDEgPiAyNTUpIHsgc3BlZWQxID0gMjU1O31cbiAgICAgIGlmKHNwZWVkMSA8IDApIHtzcGVlZDEgPSAwO31cbiAgICAgIGlmKHNwZWVkMiA+IDI1NSkge3NwZWVkMiA9IDI1NTt9XG4gICAgICBpZihzcGVlZDIgPCAwKSB7c3BlZWQyID0gMDt9XG4gICAgICByYy5tb3ZlUm9ib3QoNSxNYXRoLnJvdW5kKHNwZWVkMSksTWF0aC5yb3VuZChzcGVlZDIpKTtcbiAgICB9XG4gICAgdGhpcy5vbm1vdXNldXAgPSBmdW5jdGlvbiAoKSB7XG4gICAgICBkb2N1bWVudC5vbm1vdXNlbW92ZSA9IG51bGw7XG4gICAgICByYy5tb3ZlUm9ib3QoNCwwLDApO1xuICAgIH1cbiAgfVxuICAvLyBiaW5kIG1vdXNlXG4gIGRvY3VtZW50Lm9ubW91c2Vkb3duID0gZnVuY3Rpb24oZSkge1xuICAgIGNvbnNvbGUubG9nKFwiZGVidWcgQlwiKTtcbiAgICBpZiAoIW1lLnJlbW90ZS52aXNpYmxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICBtb3VzZU1vdGlvbkN0cmwoZSk7XG4gICAgY29uc29sZS5sb2coJ2RlYmlnJyk7XG4gIH07XG4gIC8qXG4gIC8vR0FNRVBBRFxuICB2YXIgaGF2ZUV2ZW50cyA9ICdHYW1lcGFkRXZlbnQnIGluIHdpbmRvdztcbiAgdmFyIGNvbnRyb2xsZXJzID0ge307XG4gIHZhciByQUYgPSB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIFxuICBcbiAgXG4gIFxuICBmdW5jdGlvbiBjb25uZWN0aGFuZGxlcihlKXtcbiAgICAvL2FkZGdhbWVwYWQoZS5nYW1lcGFkKTtcbiAgICBjb25zb2xlLmxvZyhcIkNvbnRyb2xldXIgaWQ6JWQgY29ubmVjdGU6JXMuICVkIGJvdXRvbnMsICVkIGF4ZXMuXCIsXG4gICAgZS5nYW1lcGFkLmluZGV4LFxuICAgIGUuZ2FtZXBhZC5pZCxcbiAgICBlLmdhbWVwYWQuYnV0dG9ucy5sZW5ndGgsXG4gICAgZS5nYW1lcGFkLmF4ZXMubGVuZ3RoKTtcbiAgfVxuICBcbiAgZnVuY3Rpb24gZGlzY29ubmVjdGhhbmRsZXIoZSl7XG4gICAgcmVtb3ZlZ2FtZXBhZChlLmdhbWVwYWQpO1xuICB9XG4gIFxuICBmdW5jdGlvbiBzY2FuZ2FtZXBhZHMoKXtcbiAgIHZhciBnYW1lcGFkcyA9IG5hdmlnYXRvci5nZXRHYW1lcGFkcyA/IG5hdmlnYXRvci5nZXRHYW1lcGFkcygpIDogKG5hdmlnYXRvci53ZWJraXRHZXRHYW1lcGFkcyA/IG5hdmlnYXRvci53ZWJraXRHZXRHYW1lcGFkcygpIDogW10pO1xuICAgZm9yICh2YXIgaSA9IDA7IGkgPCBnYW1lcGFkcy5sZW5ndGg7IGkrKykge1xuICAgfSBcbiAgfVxuICBcbiAgXG4gIC8vUmVtb3RlIENvbnRyb2xcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJnYW1lcGFkY29ubmVjdGVkXCIsY29ubmVjdGhhbmRsZXIpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImdhbWVwYWRkaXNjb25uZWN0ZWRcIixkaXNjb25uZWN0aGFuZGxlcik7XG4gIGlmKCFoYXZlRXZlbnRzKSB7XG4gICAgc2V0SW50ZXJ2YWwoc2NhbmdhbWVwYWRzLDUwMCk7XG4gIH1cdFxuKi9cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gR1VJO1xuIiwiLyoqXG4gKiBHcmFudHMgYWNjZXNzIHRvIHRoZSByb2JvdCBieSBldGFibGlzaGluZyBhIFJPUyBjb25uZWN0aW9uXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7R1VJfSBndWkgR1VJIGluc3RhbmNlXG4gKi9cbmZ1bmN0aW9uIFJvc0Nvbm5lY3Rpb24oZ3VpKSB7XG4gIC8qKiBSb3MgaW5zdGFuY2UgKi9cbiAgdGhpcy5yb3MgPSBudWxsO1xuICAvKiogR1VJIGluc3RhbmNlICovXG4gIHRoaXMuZ3VpID0gZ3VpO1xuICAvKiogVG9waWMgdG8gc2VuZCBtb3ZlbWVudCBvcmRlcnMgKi9cbiAgdGhpcy5tb3ZlVG9waWMgPSBudWxsO1xuICAvKiogVG9waWMgdG8gcmVjZWl2ZSB1bHRyYXNvdW5kIGRhdGEgKi9cbi8vICB0aGlzLnVsdHJhc291bmRUb3BpYyA9IG51bGw7XG4gIC8qKiBJUCBhbmQgcG9ydCB0byBjb25uZWN0IHRvICovXG4gIHRoaXMuaXAgPSAnJztcbn1cblxuLyoqXG4gKiBDb25uZWN0IHRvIGEgZ2l2ZW4gSVAgdXNpbmcgYSBXZWJTb2NrZXRcbiAqIEBwYXJhbSB7c3RyaW5nfSBpcCBtdXN0IGRlZmluZSB0aGUgcG9ydCBhcyB3ZWxsOiAxMjcuMC4wLjE6OTA5MFxuICovXG5Sb3NDb25uZWN0aW9uLnByb3RvdHlwZS5jb25uZWN0ID0gZnVuY3Rpb24gY29ubmVjdChpcCkge1xuICB0aGlzLmlwID0gaXA7XG4gIHRoaXMucm9zID0gbmV3IFJPU0xJQi5Sb3Moe1xuICAgIHVybDogJ3dzOi8vJyArIGlwXG4gIH0pO1xuICB0aGlzLl9jcmVhdGVFdmVudHMoKTtcbiAgdGhpcy5fY3JlYXRlVG9waWNzKCk7XG59O1xuXG4vKipcbiAqIENyZWF0ZSBldmVudHMgZm9yIGEgcm9zIGNvbm5lY3Rpb24uIFRoaXMgbXVzdCBiZSBjYWxsZWQganVzdCBhZnRlclxuICogY2FsbGluZyBjb25uZWN0XG4gKiBAcHJpdmF0ZVxuICovXG5Sb3NDb25uZWN0aW9uLnByb3RvdHlwZS5fY3JlYXRlRXZlbnRzID0gZnVuY3Rpb24gY3JlYXRlRXZlbnRzKCkge1xuICB2YXIgbWUgPSB0aGlzO1xuICB0aGlzLnJvcy5vbignY29ubmVjdGlvbicsIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgJC5ib290c3RyYXBHcm93bCgnQ29ubmVjdGVkIHRvIHJvYm90IGF0ICcgKyBlcnJvci5jdXJyZW50VGFyZ2V0LnVybCwge1xuICAgICAgdHlwZTogJ3N1Y2Nlc3MnLFxuICAgICAgd2lkdGg6ICdhdXRvJ1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCdDb25uZWN0ZWQgdG8gd2Vic29ja2V0IHNlcnZlci4nKTtcbiAgICBtZS5ndWkucmVzZXRDb25uZWN0Rm9ybSgpO1xuICAgIG1lLmd1aS5oaWRlQ29ubmVjdEZvcm0oKTtcbiAgICBtZS5ndWkuc2hvd1JlbW90ZSgpO1xuXG4gICAgLy8gY2hhbmdlIGltZyBzcmNcbiAgICAvLyBYWFggUE9SVCBuZWVkIHRvIGJlIGR5bmFtaWNhbGx5IGNoYW5nZWRcbiAgICBtZS5ndWkucmVtb3RlLmltZy5wcm9wKCdzcmMnLCAnLy8nICsgbWUuaXAucmVwbGFjZSgnOTA5MCcsICczMDAyJykgKyBtZS5ndWkucmVtb3RlLmltZy5hdHRyKCdkYXRhLXVyaScpKTtcbiAgfSk7XG4gIHRoaXMucm9zLm9uKCdlcnJvcicsIGZ1bmN0aW9uKGVycm9yKSB7XG4gICAgJC5ib290c3RyYXBHcm93bCgnRXJyb3IgY29ubmVjdGluZyB0byByb2JvdCBhdCAnICsgZXJyb3IuY3VycmVudFRhcmdldC51cmwsIHtcbiAgICAgIHR5cGU6ICdkYW5nZXInLFxuICAgICAgd2lkdGg6ICdhdXRvJ1xuICAgIH0pO1xuICAgIGNvbnNvbGUubG9nKCdFcnJvciBjb25uZWN0aW5nIHRvIHdlYnNvY2tldCBzZXJ2ZXI6ICcsIGVycm9yKTtcbiAgICBtZS5ndWkucmVzZXRDb25uZWN0Rm9ybSgpO1xuICAgIC8vIFhYWCBUZXN0aW5nIGludmVydCBjb21tZW50cyB3aGVuIGRvbmVcbiAgICAvL21lLmd1aS5yZXNldENvbm5lY3RGb3JtKCk7XG4gICAgLy9tZS5ndWkuaGlkZUNvbm5lY3RGb3JtKCk7XG4gICAgLy9tZS5ndWkuc2hvd1JlbW90ZSgpO1xuICAgIC8vbWUuZ3VpLnJlbW90ZS5pbWcucHJvcCgnc3JjJywgJy8vJyArIG1lLmlwLnJlcGxhY2UoJzkwOTAnLCAnMzAwMicpICsgbWUuZ3VpLnJlbW90ZS5pbWcuYXR0cignZGF0YS11cmknKSk7XG4gIH0pO1xuXG4gIHRoaXMucm9zLm9uKCdjbG9zZScsIGZ1bmN0aW9uKCkge1xuICAgIC8vIFRPRE8gY2FsbCB0aGUgcmVzZXRzIG9uIEdVSVxuICAgIGNvbnNvbGUubG9nKCdST1Mgd3MgY2xvc2VkLicpO1xuICB9KTtcbn07XG5cbi8qKlxuICogQ3JlYXRlIHRvcGljcyBvbmNlIHRoZSByb3MgY29ubmVjdGlvbiBpcyBldGFibGlzaGVkLiBUaGlzIGFsbG93c1xuICogcHVibGlzaGluZyBtZXNzYWdlcy5cbiAqIEBwcml2YXRlXG4gKi9cblJvc0Nvbm5lY3Rpb24ucHJvdG90eXBlLl9jcmVhdGVUb3BpY3MgPSBmdW5jdGlvbiBjcmVhdGVUb3BpY3MoKSB7XG4gIHRoaXMubW92ZVRvcGljID0gbmV3IFJPU0xJQi5Ub3BpYyh7XG4gICAgcm9zOiB0aGlzLnJvcyxcbiAgICAvL25hbWUgOiAnL2NtZF92ZWwnLFxuICAgIG5hbWU6ICcvY21kJyxcbiAgICBtZXNzYWdlVHlwZTogJ3JvYmFpcl9kZW1vL0NvbW1hbmQnIC8vbWV0ZXIgdW4gdGlwbyBkZSBtZW5zYWplIHZhbGlkbyBlbiBlbCBkaXIgJy9tc2cnIGRlbCBwYWNrYWdlXG4gICAgICAvL21lc3NhZ2VUeXBlIDogJ2dlb21ldHJ5X21zZ3MvVHdpc3QnXG4gIH0pO1xuICAvL3RoaXMudWx0cmFzb3VuZFRvcGljID0gbmV3IFJPU0xJQi5Ub3BpYyh7XG4gIC8vICByb3M6IHRoaXMucm9zLFxuICAvLyAgbmFtZTogJy9zZW5zb3IvdWx0cmFzb3VuZF9vYnN0YWNsZXMnLFxuICAvLyAgbWVzc2FnZVR5cGU6J3N0ZF9tc2dzL1N0aW5nJ1xuICAvL30pO1xufTtcblxuLyoqXG4gKiBTZW5kIGEgbWVzc2FnZSB0byBtb3ZlIHRoZSByb2JvdFxuICogQHBhcmFtIHtOdW1iZXJ9IGRpciBWYWx1ZSBiZXR3ZWVuIDAgYW5kIDQuIDQgPSBTdG9wXG4gKi9cblJvc0Nvbm5lY3Rpb24ucHJvdG90eXBlLm1vdmVSb2JvdCA9IGZ1bmN0aW9uIG1vdmVSb2JvdChkaXIsc3BlZWQxLHR1cm4pIHtcbiAgdmFyIG1zZyA9IG5ldyBST1NMSUIuTWVzc2FnZSh7XG4gICAgbW92ZTogZGlyLCAvL3tcInRvcFwiOiAwLCBcImJvdHRvbVwiOiAxLCBcImxlZnRcIjogMiwgXCJyaWdodFwiOiAzLCBcInNcIjogNH1cbiAgICBzcGVlZDE6IHNwZWVkMSxcbiAgICB0dXJuOiB0dXJuXG4gIH0pO1xuXG4gIC8vUHVibGlzaCBvbiBUb3BpY1xuICBjb25zb2xlLmxvZygnU2VuZGluZyBtb3ZlIGNvbW1hbmQgd2l0aCBkaXIgJyArIGRpcik7XG4gIHRoaXMubW92ZVRvcGljLnB1Ymxpc2gobXNnKTtcbn07XG5cbi8vUm9zQ29ubmVjdGlvbi5wcm90b3R5cGUudWx0cmFzb3VuZFJvYm90ID0gZnVuY3Rpb24gdWx0cmFzb3VuZFJvYm90KCkge1xuLy8gIHZhciBtc2cgPSBuZXcgUk9TTElCLk1lc3NhZ2Uoe1xuICAgIFxuLy8gIH0pO1xuLy99O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFJvc0Nvbm5lY3Rpb247XG4iLCIvKipcbiAqIFN0b3JhZ2Ugb2JqZWN0IHRvIHN0b3JlIGFueSBpbmZvcm1hdGlvbiBuZWVkZWQgYnkgdHdvIGRpZmZlcmVudCBzZXNzaW9uc1xuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge0dVSX0gZ3VpIEdVSSBpbnN0YW5jZVxuICovXG5cbmZ1bmN0aW9uIFN0b3JhZ2UoZ3VpKSB7XG4gIHRoaXMuZ3VpID0gZ3VpO1xufVxuXG5pZiAodHlwZW9mKFN0b3JhZ2UpICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gIC8qKlxuICAgKiBTYXZlcyBJUCB3aGVuIHJlbWVtYmVyIGNoZWNrYm94IGlzIGNoZWNrZWRcbiAgICovXG4gIFN0b3JhZ2UucHJvdG90eXBlLnNhdmVJUCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBpcCA9IHRoaXMuZ3VpLmNvbm5lY3QuaXAudmFsKCk7XG4gICAgdmFyIHJlbWVtYmVyID0gdGhpcy5ndWkuY29ubmVjdC5yZW1lbWJlci5wcm9wKCdjaGVja2VkJyk7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2lwJywgcmVtZW1iZXIgPyBpcCA6ICcnKTtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgncmVtZW1iZXInLCByZW1lbWJlcik7XG4gIH07XG5cbiAgLyoqXG4gICAqIExvYWQgYSBwcmV2aW91c2x5IHNhdmVkIElQIGZyb20gTG9jYWxTdG9yYWdlIGFuZCBjaGFuZ2UgdGhlXG4gICAqIGNvcnJlc3BvbmRpbmcgaW5wdXRcbiAgICovXG4gIFN0b3JhZ2UucHJvdG90eXBlLmxvYWRJUCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGlwID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ2lwJyk7XG4gICAgdmFyIHJlbWVtYmVyID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JlbWVtYmVyJyk7XG4gICAgdGhpcy5ndWkuY29ubmVjdC5pcC52YWwoaXApO1xuICAgIHRoaXMuZ3VpLmNvbm5lY3QucmVtZW1iZXIucHJvcCgnY2hlY2tlZCcsIHJlbWVtYmVyKTtcbiAgfTtcbn0gZWxzZSB7XG4gIFN0b3JhZ2UucHJvdG90eXBlLnNhdmVJUCA9IGZ1bmN0aW9uKCkge307XG4gIFN0b3JhZ2UucHJvdG90eXBlLmxvYWRJUCA9IGZ1bmN0aW9uKCkge307XG59XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmFnZTtcbiIsIi8vIGluY2x1ZGUgZGVwZW5kZW5jaWVzXG52YXIgUm9zQ29ubmVjdGlvbiA9IHJlcXVpcmUoJy4vUm9zQ29ubmVjdGlvbicpO1xudmFyIEdVSSA9IHJlcXVpcmUoJy4vR3VpJyk7XG52YXIgU3RvcmFnZSA9IHJlcXVpcmUoJy4vU3RvcmFnZScpO1xuXG4vLyB3YWl0IHVudGlsIHRoZSBkb20gaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuICAvLyBHZW5lcmFsIHV0aWxpdGllc1xuICB2YXIgZ3VpID0gbmV3IEdVSSgpO1xuICB2YXIgcm9zID0gbmV3IFJvc0Nvbm5lY3Rpb24oZ3VpKTtcbiAgdmFyIHN0b3JhZ2UgPSBuZXcgU3RvcmFnZShndWkpO1xuXG4gIGd1aS5iaW5kQ29ubmVjdChyb3MsIHN0b3JhZ2UpO1xuICBndWkuYmluZFJlbW90ZShyb3MsIHN0b3JhZ2UpO1xufSk7XG4iLCIvKipcbiAqIEBuYW1lc3BhY2UgdXRpbHNcbiAqIEBkZXNjcmlwdGlvbiBHaXZlcyBzb21lIHV0aWxpdHkgZnVuY3Rpb25zIHRoYXQgZG8gbm90IGJlbG9uZyBhbnl3aGVyZVxuICogZWxzZSBpbiB0aGUgY29kZVxuICovXG52YXIgdXRpbHMgPSB7XG4gIC8qKlxuICAgKiBDaGVjayBpZiBhbiBpcCBpcyB2YWxpZFxuICAgKiBAcGFyYW0ge3N0cmluZ30gaXAgSVAgdG8gY2hlY2sgYWdhaW5zdFxuICAgKiBAcmV0dXJuIHtib29sZWFufSB0cnVlIGlmIHRoZSBJUCBpcyB2YWxpZCwgZmFsc2Ugb3RoZXJ3aGlzZVxuICAgKi9cbiAgaXNJUFZhbGlkOiBmdW5jdGlvbiBpc0lQVmFsaWQoaXApIHtcbiAgICB2YXIgdGFiID0gaXBSZWcuZXhlYyhpcCk7XG4gICAgaWYgKCF0YWIpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHBhcnNlSW50KHRhYls0XSwgMTApID4gMTAyNDtcbiAgfSxcbiAgLyoqXG4gICAqIEtleUNvZGVzIGZvciBiZXR0ZXIgcmVhZGFiaWxpdHlcbiAgICovXG4gIGtleXM6IHtcbiAgICBTUEFDRTogMzIsXG4gICAgTEVGVDogMzcsXG4gICAgVVA6IDM4LFxuICAgIFJJR0hUOiAzOSxcbiAgICBET1dOOiA0MCxcbiAgICBTOiA4MyxcbiAgfVxufTtcblxudmFyIGlwUmVnID0gbmV3IFJlZ0V4cCgnXigoMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcLil7M30oMjVbMC01XXwyWzAtNF1bMC05XXxbMDFdP1swLTldWzAtOV0/KVxcOihbMS05XVswLTldKikkJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbHM7XG4iXX0=
