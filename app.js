if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
        .then(success, failure);
}

function success (midi) {
    var inputs = midi.inputs.values();
    for (var input = inputs.next();
     input && !input.done;
     input = inputs.next()) {
    // each time there is a midi message call the onMIDIMessage function
    input.value.onmidimessage = onMIDIMessage;
}
}
 
function failure () {
    console.error('No access to your midi devices.')
}

function onMIDIMessage (message) {
        var frequency = midiNoteToFrequency(message.data[1]);


        if (message.data[0] === 144 && message.data[2] > 0) {
        	        var frequency = midiNoteToFrequency(message.data[1]);

playNote(message.data[1],frequency);
}

if(message.data[0] === 224){
	ccToSlider(message.data[2], "#cutoff1");
}

if(message.data[0] === 225){
	ccToSlider(message.data[2], "#res1");
}

if (message.data[0] === 128 || message.data[0] === 144 && message.data[2] === 0) {
stopNote(message.data[1]);
}
}

function midiNoteToFrequency (note) {
    return Math.pow(2, ((note - 69) / 12)) * 440;
}

function ccToSlider(ccVal, sliderId){

slider = $(sliderId);
sliderMin = slider.attr('min');
sliderMax = slider.attr('max');
slider.val(ccVal.map(0,127,sliderMin,sliderMax));
slider.trigger('input');

}


var ctx = new AudioContext(),
mainGain = ctx.createGain(),
gain1 = ctx.createGain(),
gain2 = ctx.createGain(),
filter1 = ctx.createBiquadFilter(),
filter2 = ctx.createBiquadFilter(),
delay = ctx.createDelay(),
compressor = ctx.createDynamicsCompressor(),
waveOsc1 = new WavyJones(ctx, 'waveform1'),
active_voices1 = {},
active_voices2 = {};
lfo = ctx.createOscillator();
lfoGain = ctx.createGain();
lfoGain.gain.value= presets.init.lfoAmount;
lfo.type = "sine";
lfo.frequency.value = presets.init.lfoFreq;
mainGain.gain.value = 0.5;
lfo.connect(lfoGain);

waveOsc1.lineColor = "#0f0";
waveOsc1.lineThickness = 1;
compressor.threshold.value = -0.3;
compressor.knee.value = 0.0; // brute force
compressor.ratio.value = 20.0; // max compression
compressor.attack.value = 0.005; // 5ms attack
compressor.release.value = 0.050;
mainGain.connect(waveOsc1);
waveOsc1.connect(compressor);
compressor.connect(ctx.destination);

noiseFormReal = [];
for(i = 0; i < 16; i++){
	noiseFormReal[i] = (Math.random() * 2) - 1;
}

noiseFormImag = [];
for(i = 0; i < 16; i++){
	noiseFormImag[i] = (Math.random() * 2) - 1;
}

waveforms.noise = {
	real: noiseFormReal,
	imag: noiseFormImag
}

var wfPresets =  [];

for(var key in waveforms){
	wfPresets.push(waveforms[key].real);
}

var	keyboard = new QwertyHancock({
                 id: 'keyboard',
                 width: $('#keyboard').width(),
                 height: 150,
                 octaves: 4,
                 startNote: 'C3',
                 whiteNotesColour: 'white',
                 blackNotesColour: 'black',
                 hoverColour: '#f3e939'
            });


for(var key in presets.init){
	$('#' + key).val(presets.init[key])
}

var Waveform = (function(ctx){

function Waveform(){
	// This creates a periodic wave defined by an array, or a sine wave by default.
	real = [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0];
	this.real = new Float32Array(real);
	this.imag = new Float32Array(this.real.length);
};

return Waveform;

})(ctx);

var Voice = (function(ctx){

function Voice(gain,frequency,wave,cutoff,q,detune,envelope){
	this.frequency = frequency;
	this.oscillators = [];
	this.gain = ctx.createGain();
	this.realGain = ctx.createGain();
	this.realGain.gain.value = gain || 1;
	this.filter = ctx.createBiquadFilter();
	this.cutoff = cutoff || 11000;
	this.q = q || 0;
	this.detune = detune || 0;
	this.envelope = envelope || {a:0.15,d:1,s:1,r:0.02};
	this.waveform = new Waveform();
	this.waveform.real = new Float32Array(wave);
	this.waveform.imag = new Float32Array(wave.length);
};

Voice.prototype.start = function(){
		var osc = ctx.createOscillator();

		this.filter.type = "lowpass";
		this.filter.frequency.value = this.cutoff;
		lfoGain.connect(this.filter.frequency);
		this.filter.Q.value = this.q;

		var wave = ctx.createPeriodicWave(this.waveform.real,this.waveform.imag);
		osc.setPeriodicWave(wave);

		osc.frequency.linearRampToValueAtTime(this.frequency, ctx.currentTime);
		osc.detune.value = this.detune;
		this.gain.gain.value = 0;
		osc.connect(this.filter);
		this.filter.connect(this.gain);
		this.gain.connect(this.realGain);
		this.realGain.connect(mainGain);

		// this.gain.connect(synthDelay);

		osc.start();
		this.gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + parseFloat(this.envelope.a));
		this.gain.gain.exponentialRampToValueAtTime(this.envelope.s, ctx.currentTime + parseFloat(this.envelope.d));

		this.oscillators.push(osc);

		}

		Voice.prototype.stop = function() {
		this.gain.gain.cancelScheduledValues(ctx.currentTime);
		this.gain.gain.setValueAtTime(this.gain.gain.value, ctx.currentTime); 
		this.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + parseFloat(this.envelope.r));
		var that = this;
		setTimeout(function(){
		that.oscillators.forEach(function(oscillator, _) {

		oscillator.stop();
		});
		}, (this.envelope.r * 1000) + 400);
		};

		Voice.prototype.setGain = function(gain){
		this.realGain.gain.value = gain;

		}

		Voice.prototype.setWave = function(wave){
		this.waveform.real = new Float32Array(wave);
		this.waveform.imag = new Float32Array(wave.length);

			that = this;
		this.oscillators.forEach(function(osc,_){
		osc.setPeriodicWave(ctx.createPeriodicWave(that.waveform.real, that.waveform.imag));
		})
		}

		Voice.prototype.setCutoff = function(cutoff){
		this.cutoff = cutoff;
		this.filter.frequency.value = cutoff;
		}

		Voice.prototype.setQ = function(q){
		this.q = q;
		this.filter.Q.value = q;
		}

		Voice.prototype.setDetune = function(detune){
		this.detune = detune;
		this.oscillators.forEach(function(osc,_){
		osc.detune.value = detune;
		})
		}


return Voice;
})(ctx);




$('#gain1').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setGain($('#gain1').val());

}

}});

$('#gain2').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setGain($('#gain2').val());

}

}});


$('#osc1').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
		current = arrayMorph(v,parseFloat($('#osc1').attr('data-max')),wfPresets);
	for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setWave(current);

}

}});

$('#osc2').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
		current = arrayMorph(v,parseFloat($('#osc2').attr('data-max')),wfPresets);
	for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setWave(current);

}

}});

$('#detune1').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
		steps = parseFloat($('#detune1').val());
		cents = parseFloat($('#detuneFine1').val());

	for(var key in active_voices1){
	voice = active_voices1[key];
voice.setDetune(steps + cents);
}

}});

$('#detuneFine1').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
		steps = parseFloat($('#detune1').val());
		cents = parseFloat($('#detuneFine1').val());

	for(var key in active_voices1){
	voice = active_voices1[key];
voice.setDetune(steps + cents);
}

}});

$('#detune2').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
		steps = parseFloat($('#detune2').val());
		cents = parseFloat($('#detuneFine2').val());

	for(var key in active_voices1){
	voice = active_voices1[key];
voice.setDetune(steps + cents);
}

}});

$('#detuneFine2').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
		steps = parseFloat($('#detune2').val());
		cents = parseFloat($('#detuneFine2').val());

	for(var key in active_voices1){
	voice = active_voices1[key];
voice.setDetune(steps + cents);
}

}});


$('#cutoff1').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setCutoff(logslider(v));

}

}})

$('#cutoff2').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setCutoff(logslider(v));

}

}});

$('#res1').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setQ(v);
} 

}});

$('#res2').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setQ(v);
} 

}});


$('#lfoFreq').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	lfo.frequency.value = parseFloat(v);

}});

$('#lfoAmount').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC",

	change: function(v){
	lfoGain.gain.value = parseFloat(v);

}});

$('#showValues').on('click', function(){

values = {}
$('input').each(function(){

values[$(this).attr('id')] = parseFloat($(this).val())

})

console.log(JSON.stringify(values));

});



keyboard.keyDown = function (note, frequency) {
	playNote(note,frequency);
}

keyboard.keyUp = function (note,frequency) {
	stopNote(note);
}


var playNote = function(noteName,frequency){
	envelope = {
		a: $('#attack1').val(),
		d: $('#decay1').val(),
		s: $('#sustain1').val(),
		r: $('#release1').val()
	};
  steps = parseFloat($('#detune1').val());
	cents = parseFloat($('#detuneFine1').val());
wf = arrayMorph($('#osc1').val(),$('#osc1').attr('data-max'),wfPresets)
var voice1= new Voice($('#gain1').val(),frequency, 
	wf,
	logslider($('#cutoff1').val()),
	$('#res1').val(),
	steps + cents,
	envelope
		);

active_voices1[noteName] = voice1;
  voice1.start();
  steps = parseFloat($('#detune2').val());
	cents = parseFloat($('#detuneFine2').val());
	wf = arrayMorph($('#osc2').val(),$('#osc2').attr('data-max'),wfPresets);
var voice2= new Voice($('#gain2').val(),frequency, 
	wf,
	logslider($('#cutoff1').val()),
	$('#res1').val(),
	steps + cents,
	{
		a: $('#attack2').val(),
		d: $('#decay2').val(),
		s: $('#sustain2').val(),
		r: $('#release2').val()});
active_voices2[noteName] = voice2;
  voice2.start();
}

var stopNote = function(noteName){
active_voices1[noteName].stop();
delete active_voices1[noteName];
active_voices2[noteName].stop();
delete active_voices2[noteName];

}




// function makeDistortionCurve(amount) {
//   var k = typeof amount === 'number' ? amount : 50,
//     n_samples = 44100,
//     curve = new Float32Array(n_samples),
//     deg = Math.PI / 180,
//     i = 0,
//     x;
//   for ( ; i < n_samples; ++i ) {
//     x = i * 2 / n_samples - 1;
//     curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
//   }
//   return curve;
// };



function logslider(position) {
  // position will be between 0 and 100
  var minp = 0;
  var maxp = 100;

  // The result should be between 100 an 10000000
  var minv = Math.log(10);
  var maxv = Math.log(11000);

  // calculate adjustment factor
  var scale = (maxv-minv) / (maxp-minp);

  return Math.exp(minv + scale*(position-minp));
}



var arrayMorph = function(value, max, arrays) {
    current = [];
    max = parseFloat(max);
    //Get the number of arrays so we can divide the input value equally between them
    numArrays = arrays.length;
    // Get the current input value
    // Get the input's max value
    // Get the current input value as a spectrum between the values
    absMorph = value / max * (numArrays - 1);
    // This is the "hard" previous preset index
    prev = Math.floor(absMorph);
    // This is the "hard" next preset index
    next = Math.ceil(absMorph);
    // This is the decimal difference between the prev and next
    diff = absMorph - prev;
    prevArray = arrays[prev];
    nextArray = arrays[next];
    nextArray.forEach(function(v, i, a) {
        thisDiff = nextArray[i] - prevArray[i];
        thisVal = prevArray[i] + (thisDiff * diff);
        if (!isFinite(thisVal)) thisVal = 0;
        current.push(thisVal);
    });
    return current;
}


Number.prototype.map = function (in_min, in_max, out_min, out_max) {
  return (this - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

$(document).ready(function(){

lfo.start();

$('.knob').knob({
	angleOffset: -160,
	angleArc: 320,
	width: 50, 
	height: 50,
font: "VT323",
bgColor: "#030",
fgColor: "#CFC"});


})