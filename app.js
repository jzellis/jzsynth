

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
    console.log(message.data);
        var frequency = midiNoteToFrequency(message.data[1]);


        if (message.data[0] === 144 && message.data[2] > 0) {
playNote(message.data[1],frequency);
}

if (message.data[0] === 128 || message.data[2] === 0) {
stopNote(message.data[1]);
}
}

function midiNoteToFrequency (note) {
    return Math.pow(2, ((note - 69) / 12)) * 440;
}


 
var ctx = new AudioContext(),
osc1= ctx.createOscillator(),
osc2= ctx.createOscillator(),

gain1 = ctx.createGain(),
gain2 = ctx.createGain(),

distortion1 = ctx.createWaveShaper(),
filter1 = ctx.createBiquadFilter(),
filter2 = ctx.createBiquadFilter(),
compressor = ctx.createDynamicsCompressor(),
keyboard = new QwertyHancock({
                 id: 'keyboard',
                 width: $('#keyboard').width(),
                 height: 150,
                 octaves: 4,
                 startNote: 'C3',
                 whiteNotesColour: 'white',
                 blackNotesColour: 'black',
                 hoverColour: '#f3e939'
            }),
active_voices1 = {},
active_voices2 = {};

var waveforms = {
sqr: [0.64,0.02,0.1,0,0.9,0,0.09,0,0.07,0,0.06,0,0.05,0],
sin: [0,0,1,0,0,0,0,0,0,0,0,0,0,0,0],
tri: [0.81,0,-0.09,0,0.03,0,-0.02,0,0.01,0,-0.01,0,0,0],
saw: [-0.32,-0.16,-0.11,-0.08,-0.06,-0.05,-0.05,-0.04,-0.04,-0.03,-0.03,-0.02,-0.02]

};

waves = {sin : ctx.createPeriodicWave(new Float32Array(waveforms.sin),new Float32Array(waveforms.sin.length)),
sqr : ctx.createPeriodicWave(new Float32Array(waveforms.sqr),new Float32Array(waveforms.sqr.length)),
tri :  ctx.createPeriodicWave(new Float32Array(waveforms.tri),new Float32Array(waveforms.tri.length)),
saw : ctx.createPeriodicWave(new Float32Array(waveforms.saw),new Float32Array(waveforms.saw.length))
};

compressor.threshold.value= -0.3;
compressor.knee.value = 40;
compressor.connect(ctx.destination);


// changePitch(500);

var Voice = (function(ctx){

function Voice(frequency,wave,cutoff,q,detune,envelope){
	this.frequency = frequency;
	this.oscillators = [];
	this.wave = wave || "sin";
	this.gain = ctx.createGain();
	this.filter = ctx.createBiquadFilter();
	this.cutoff = cutoff || 11000;
	this.q = q || 0;
	this.detune = detune || 0;
	this.envelope = envelope || {a:0.15,d:1,s:1,r:0.02};
};

Voice.prototype.start = function(){
	console.log(this.envelope);
	var osc = ctx.createOscillator();

	this.filter.type = "lowpass";
	this.filter.frequency.value = this.cutoff;
	this.filter.Q.value = this.q;

	var wave = ctx.createPeriodicWave(new Float32Array(waveforms[this.wave]),new Float32Array(waveforms[this.wave].length));
	osc.setPeriodicWave(wave);

	osc.frequency.linearRampToValueAtTime(this.frequency, ctx.currentTime);
	osc.detune.value = this.detune;
	this.gain.gain.value = 0;
	osc.connect(this.filter);
	this.filter.connect(this.gain);
	this.gain.connect(compressor);
	osc.start();
	this.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + parseFloat(this.envelope.a));
	this.gain.gain.exponentialRampToValueAtTime(this.envelope.s, ctx.currentTime + parseFloat(this.envelope.d));

	this.oscillators.push(osc);

}

Voice.prototype.stop = function() {
	this.gain.gain.cancelScheduledValues(ctx.currentTime);
	this.gain.gain.setValueAtTime(this.gain.gain.value, ctx.currentTime); 
	this.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + parseFloat(this.envelope.r));
	var that = this;
	console.log((this.envelope.r));
  setTimeout(function(){
  	that.oscillators.forEach(function(oscillator, _) {
	
    oscillator.stop();
  });
}, (this.envelope.r * 1000) + 400);
};

Voice.prototype.setWave = function(wave){
	this.wave = wave;
	this.oscillators.forEach(function(osc,_){
		theWave = ctx.createPeriodicWave(new Float32Array(waveforms[wave]),new Float32Array(waveforms[wave].length));
		osc.setPeriodicWave(theWave);
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


$('input').each(function(i){

$(this).on('input',function(){
		display = $(this).attr('id') + ": " + $(this).val();
	console.log(display);
	$('#display').html(display)
})


});

$('#detune').on('input', function(e){
	steps = parseFloat($('#detune').val());
	cents = parseFloat($('#detuneFine').val());

for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setDetune(steps + cents);
}})

$('#detuneFine').on('input', function(e){
	steps = parseFloat($('#detune').val());
	cents = parseFloat($('#detuneFine').val());

for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setDetune(steps + cents);
}
})


$('#osc1').on('change',function(){
	oscType = $(this).val();

for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setWave(oscType);
}

})

$('#osc2').on('change',function(){
	oscType = $(this).val();

for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setWave(oscType);
}

})


$('#cutoff1').on('input', function(e){
	cutoff = $(e.currentTarget).val();
	for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setCutoff(logslider(cutoff));
}
})

$('#cutoff2').on('input', function(e){
	cutoff = $(e.currentTarget).val();
	for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setCutoff(logslider(cutoff));
}});

$('#res1').on('input', function(e){
	res = $(e.currentTarget).val();
	for(var key in active_voices1){
	voice = active_voices1[key];
	voice.setQ(res);
} 
});

$('#res2').on('input', function(e){
	res = $(e.currentTarget).val();
	for(var key in active_voices2){
	voice = active_voices2[key];
	voice.setQ(res);
}});


keyboard.keyDown = function (note, frequency) {
	playNote(note,frequency);
}

keyboard.keyUp = function (note,frequency) {
	stopNote(note);
}


var playNote = function(noteName,frequency){
var voice1= new Voice(frequency, 
	$('#osc1').val(),
	logslider($('#cutoff1').val()),
	$('#res1').val(),
	0,
	{
		a: $('#attack1').val(),
		d: $('#decay1').val(),
		s: $('#sustain1').val(),
		r: $('#release1').val()}
		);
active_voices1[noteName] = voice1;
  voice1.start();
  steps = parseFloat($('#detune').val());
	cents = parseFloat($('#detuneFine').val());

var voice2= new Voice(frequency, 
	$('#osc1').val(),
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




function makeDistortionCurve(amount) {
  var k = typeof amount === 'number' ? amount : 50,
    n_samples = 44100,
    curve = new Float32Array(n_samples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for ( ; i < n_samples; ++i ) {
    x = i * 2 / n_samples - 1;
    curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
  }
  return curve;
};



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