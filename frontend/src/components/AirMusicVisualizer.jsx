import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import * as Tone from 'tone';

const AirMusicVisualizer = () => {
    const canvasRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentCity, setCurrentCity] = useState('HongKong');
    const [hasStartedAudio, setHasStartedAudio] = useState(false);
    const instrumentsRef = useRef({});
    const synthRef = useRef(null);
    const [aqData, loadAQData] = useState({
        aqius: 0,
        co: 0,
        no2: 0,
        o3: 0,
        pm10: 0,
        pm25: 0,
        so2: 0
    });

    // AQI level presets
    const aqiLevels = {
        good: {
            label: 'Good',
            values: {
                aqius: 30
            },
            color: 'bg-green-500'
        },
        moderate: {
            label: 'Moderate',
            values: {
                aqius: 80
            },
            color: 'bg-yellow-500'
        },
        unhealthy: {
            label: 'Unhealthy',
            values: {
                aqius: 150
            },
            color: 'bg-red-500'
        },
        hazardous: {
            label: 'Hazardous',
            values: {
                aqius: 300
            },
            color: 'bg-purple-500'
        }
    };

    const fetchAQData = async () => {
        try {
            const response = await fetch(`https://airphonic.onrender.com/api/get-latest?city=${currentCity}`);
            const data = await response.json();
            console.log(`Fetching data for ${currentCity}:`, data);

            loadAQData({
                aqius: data[0].value,
                co: data[1].value,
                no2: data[2].value,
                o3: data[3].value,
                pm10: data[4].value,
                pm25: data[5].value,
                so2: data[6].value,
            });
        } catch (error) {
            console.error(`Error fetching air quality data for ${currentCity}:`, error);
        }
    };

    // Update the city change handler
    const handleCityChange = (e) => {
        const newCity = e.target.value;
        setCurrentCity(newCity);
        // Fetch new data when city changes
        fetchAQData();
    };

    // Separate synth for pollutant buttons
    const buttonSynthRef = useRef(null);

    // Different sounds for each pollutant and level
    const pollutantSounds = {
        pm25: {
            good: { notes: ['C4', 'E4', 'G4'], length: '4n' },
            moderate: { notes: ['D4', 'F4', 'A4'], length: '4n' },
            unhealthy: { notes: ['Eb4', 'Gb4', 'Bb4'], length: '4n' },
            hazardous: { notes: ['D4', 'F4', 'Ab4'], length: '4n' }
        },
        pm10: {
            good: { notes: ['G4', 'B4', 'D5'], length: '4n' },
            moderate: { notes: ['A4', 'C5', 'E5'], length: '4n' },
            unhealthy: { notes: ['Ab4', 'B4', 'Eb5'], length: '4n' },
            hazardous: { notes: ['G4', 'Bb4', 'Db5'], length: '4n' }
        },
        so2: {
            good: { notes: ['C5', 'E5', 'G5'], length: '4n' },
            moderate: { notes: ['D5', 'F5', 'A5'], length: '4n' },
            unhealthy: { notes: ['Eb5', 'Gb5', 'Bb5'], length: '4n' },
            hazardous: { notes: ['D5', 'F5', 'Ab5'], length: '4n' }
        },
        no2: {
            good: { notes: ['E4', 'G4', 'B4'], length: '4n' },
            moderate: { notes: ['F4', 'Ab4', 'C5'], length: '4n' },
            unhealthy: { notes: ['Eb4', 'G4', 'Bb4'], length: '4n' },
            hazardous: { notes: ['E4', 'G4', 'Bb4'], length: '4n' }
        },
        o3: {
            good: { notes: ['A4', 'C5', 'E5'], length: '4n' },
            moderate: { notes: ['Bb4', 'Db5', 'F5'], length: '4n' },
            unhealthy: { notes: ['Ab4', 'C5', 'Eb5'], length: '4n' },
            hazardous: { notes: ['A4', 'C5', 'Eb5'], length: '4n' }
        },
        co: {
            good: { notes: ['D4', 'F4', 'A4'], length: '4n' },
            moderate: { notes: ['Eb4', 'G4', 'Bb4'], length: '4n' },
            unhealthy: { notes: ['D4', 'F4', 'Ab4'], length: '4n' },
            hazardous: { notes: ['D4', 'F4', 'Ab4'], length: '4n' }
        }
    };

    // Pollutant level presets
    const pollutantLevels = {
        pm25: {
            name: 'PM2.5',
            unit: 'μg/m³',
            levels: {
                good: { value: 15, label: 'Good', color: 'bg-green-500' },
                moderate: { value: 35, label: 'Moderate', color: 'bg-yellow-500' },
                unhealthy: { value: 75, label: 'Unhealthy', color: 'bg-red-500' },
                hazardous: { value: 150, label: 'Hazardous', color: 'bg-purple-500' }
            }
        },
        pm10: {
            name: 'PM10',
            unit: 'μg/m³',
            levels: {
                good: { value: 25, label: 'Good', color: 'bg-green-500' },
                moderate: { value: 50, label: 'Moderate', color: 'bg-yellow-500' },
                unhealthy: { value: 110, label: 'Unhealthy', color: 'bg-red-500' },
                hazardous: { value: 250, label: 'Hazardous', color: 'bg-purple-500' }
            }
        },
        so2: {
            name: 'SO₂',
            unit: 'ppb',
            levels: {
                good: { value: 20, label: 'Good', color: 'bg-green-500' },
                moderate: { value: 40, label: 'Moderate', color: 'bg-yellow-500' },
                unhealthy: { value: 100, label: 'Unhealthy', color: 'bg-red-500' },
                hazardous: { value: 200, label: 'Hazardous', color: 'bg-purple-500' }
            }
        },
        no2: {
            name: 'NO₂',
            unit: 'ppb',
            levels: {
                good: { value: 30, label: 'Good', color: 'bg-green-500' },
                moderate: { value: 60, label: 'Moderate', color: 'bg-yellow-500' },
                unhealthy: { value: 120, label: 'Unhealthy', color: 'bg-red-500' },
                hazardous: { value: 240, label: 'Hazardous', color: 'bg-purple-500' }
            }
        },
        o3: {
            name: 'O₃',
            unit: 'ppb',
            levels: {
                good: { value: 25, label: 'Good', color: 'bg-green-500' },
                moderate: { value: 50, label: 'Moderate', color: 'bg-yellow-500' },
                unhealthy: { value: 100, label: 'Unhealthy', color: 'bg-red-500' },
                hazardous: { value: 200, label: 'Hazardous', color: 'bg-purple-500' }
            }
        },
        co: {
            name: 'CO',
            unit: 'ppb',
            levels: {
                good: { value: 500, label: 'Good', color: 'bg-green-500' },
                moderate: { value: 1000, label: 'Moderate', color: 'bg-yellow-500' },
                unhealthy: { value: 2000, label: 'Unhealthy', color: 'bg-red-500' },
                hazardous: { value: 4000, label: 'Hazardous', color: 'bg-purple-500' }
            }
        }
    };

    // Enhanced city-specific music patterns with cultural elements
    const cityMusic = {
        HongKong: {
            melody: ['C5', 'D5', 'E5', 'G5', 'A5', 'G5', 'E5', 'D5'], // Pentatonic melody
            harmony: [['C4', 'E4', 'G4'], ['G3', 'B3', 'D4']],
            bass: ['C3', 'G2', 'A2', 'E2'],
            drums: [1, 0, 1, 0, 1, 1, 0, 1],
            instruments: {
                melody: {
                    type: 'AMSynth', // Plucked string sound for Chinese instruments
                    options: {
                        harmonicity: 3,
                        detune: 0,
                        oscillator: {
                            type: 'sine'
                        },
                        envelope: {
                            attack: 0.01,
                            decay: 0.2,
                            sustain: 0.2,
                            release: 1.2
                        },
                        modulation: {
                            type: 'square'
                        },
                        modulationEnvelope: {
                            attack: 0.5,
                            decay: 0,
                            sustain: 0.2,
                            release: 0.5
                        }
                    }
                }
            }
        },
        Bangkok: {
            melody: ['D5', 'E5', 'G5', 'A5', 'C6', 'A5', 'G5', 'E5'], // Thai-inspired scale
            harmony: [['D4', 'F4', 'A4'], ['A3', 'C4', 'E4']],
            bass: ['D3', 'A2', 'F2', 'C3'],
            drums: [1, 1, 0, 1, 0, 1, 0, 1],
            instruments: {
                melody: {
                    type: 'MetalSynth', // Gamelan-like sound
                    options: {
                        frequency: 200,
                        envelope: {
                            attack: 0.001,
                            decay: 0.2,
                            sustain: 0.1,
                            release: 0.8
                        },
                        harmonicity: 5.1,
                        modulationIndex: 32,
                        resonance: 4000,
                        octaves: 1.5
                    }
                }
            }
        },
        Beijing: {
            melody: ['E5', 'A5', 'B5', 'D6', 'E6', 'D6', 'B5', 'A5'], // Chinese scale
            harmony: [['E4', 'G4', 'B4'], ['B3', 'D4', 'F#4']],
            bass: ['E3', 'B2', 'G2', 'D3'],
            drums: [1, 0, 1, 0, 0, 1, 1, 0],
            instruments: {
                melody: {
                    type: 'FMSynth', // Erhu-like sound
                    options: {
                        harmonicity: 8.5,
                        modulationIndex: 50,
                        oscillator: {
                            type: 'sine'
                        },
                        envelope: {
                            attack: 0.1,
                            decay: 0.2,
                            sustain: 0.8,
                            release: 1.2
                        },
                        modulation: {
                            type: 'square'
                        },
                        modulationEnvelope: {
                            attack: 0.5,
                            decay: 0.01,
                            sustain: 1,
                            release: 0.5
                        }
                    }
                }
            }
        },
        Melbourne: {
            melody: ['G5', 'A5', 'B5', 'D6', 'G6', 'D6', 'B5', 'A5'], // Western scale
            harmony: [['G4', 'B4', 'D5'], ['D4', 'F#4', 'A4']],
            bass: ['G2', 'D3', 'B2', 'F#2'],
            drums: [1, 0, 0, 1, 1, 0, 1, 0],
            instruments: {
                melody: {
                    type: 'Synth', // Orchestra-like sound
                    options: {
                        oscillator: {
                            type: 'triangle'
                        },
                        envelope: {
                            attack: 0.05,
                            decay: 0.3,
                            sustain: 0.4,
                            release: 0.8
                        }
                    }
                }
            }
        }
    };

    useEffect(() => {
        fetchAQData(); // Fetch data initially and whenever the city changes

        // Initialize effects
        const reverb = new Tone.Reverb({
            decay: 2,
            wet: 0.3
        }).toDestination();

        // Initialize instruments with city-specific settings
        const city = cityMusic[currentCity];
        instrumentsRef.current = {
            melody: new Tone[city.instruments.melody.type]({
                ...city.instruments.melody.options,
                volume: -12
            }).connect(reverb),

            harmony: new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.2,
                    decay: 0.2,
                    sustain: 0.4,
                    release: 1.5
                },
                volume: -18
            }).connect(reverb),

            bass: new Tone.Synth({
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.1,
                    decay: 0.3,
                    sustain: 0.4,
                    release: 1.2
                },
                volume: -15
            }).connect(reverb),

            drums: new Tone.MembraneSynth({
                pitchDecay: 0.05,
                octaves: 2,
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.001,
                    decay: 0.4,
                    sustain: 0.01,
                    release: 1.4
                },
                volume: -20
            }).connect(reverb)
        };

        let step = 0;
        const stepsPerBeat = 8;
        const beatTime = 250; // milliseconds

        // Play music function
        const playMusic = () => {
            if (isPlaying && hasStartedAudio) {
                const music = cityMusic[currentCity];
                const now = Tone.now();

                // Adjust melody based on AQI
                const melodyNotes = aqData.aqius <= 50 ? music.melody : music.melody.map(note => Tone.Frequency(note).transpose(-2).toNote());

                // Play melody (every other step)
                if (step % 2 === 0) {
                    const melodyIndex = (step / 2) % melodyNotes.length;
                    instrumentsRef.current.melody.triggerAttackRelease(
                        melodyNotes[melodyIndex],
                        "8n",
                        now
                    );
                }

                // Adjust harmony based on pollutant levels
                const harmonyNotes = aqData.pm25 > 100 ? music.harmony.map(chord => chord.map(note => Tone.Frequency(note).transpose(-3).toNote())) : music.harmony;

                // Play harmony (every four steps)
                if (step % 4 === 0) {
                    const harmonyIndex = (step / 4) % harmonyNotes.length;
                    instrumentsRef.current.harmony.triggerAttackRelease(
                        harmonyNotes[harmonyIndex],
                        "2n",
                        now
                    );
                }

                // Play bass (every four steps)
                if (step % 4 === 0) {
                    const bassIndex = (step / 4) % music.bass.length;
                    instrumentsRef.current.bass.triggerAttackRelease(
                        music.bass[bassIndex],
                        "2n",
                        now
                    );
                }

                // Play drums
                if (music.drums[step % music.drums.length]) {
                    instrumentsRef.current.drums.triggerAttackRelease(
                        "C2",
                        "16n",
                        now
                    );
                }

                step = (step + 1) % stepsPerBeat;
            }
        };

        // Set up interval for music
        const interval = setInterval(playMusic, beatTime);

        return () => {
            clearInterval(interval);
            Object.values(instrumentsRef.current).forEach(instrument => {
                if (instrument && instrument.dispose) {
                    instrument.dispose();
                }
            });
        };
    }, [isPlaying, hasStartedAudio, currentCity, aqData]);


    // P5.js setup
    useEffect(() => {
        const sketch = new p5((p) => {
            let particles = [];

            class Particle {
                constructor(x, y) {
                    this.x = x;
                    this.y = y;
                    this.speed = p.random(-2, 2);
                    this.size = 5;
                    this.life = 255;
                }

                update() {
                    this.x += this.speed;
                    this.life -= 2;
                    if (this.x > p.width) this.x = 0;
                    if (this.x < 0) this.x = p.width;
                }

                display() {
                    p.noStroke();
                    const isGoodAir = aqData.aqius <= 50;
                    if (isGoodAir) {
                        p.fill(46, 204, 113, this.life);
                    } else {
                        p.fill(231, 76, 60, this.life);
                    }
                    p.circle(this.x, this.y, this.size);
                }

                isDead() {
                    return this.life < 0;
                }
            }

            p.setup = () => {
                const canvas = p.createCanvas(window.innerWidth, window.innerHeight);
                canvas.parent(canvasRef.current);
            };

            p.draw = () => {
                p.background(0, 25);

                if (isPlaying && p.frameCount % 30 === 0) {
                    particles.push(new Particle(
                        p.random(p.width),
                        p.random(p.height)
                    ));
                }

                for (let i = particles.length - 1; i >= 0; i--) {
                    particles[i].update();
                    particles[i].display();
                    if (particles[i].isDead()) {
                        particles.splice(i, 1);
                    }
                }

                p.fill(255);
                p.noStroke();
                p.textSize(16);
                p.text(`AQI: ${aqData.aqius}`, 20, 30);
                p.text(`Current City: ${currentCity}`, 20, 60);
                p.text(`Playing: ${isPlaying ? 'Yes' : 'No'}`, 20, 90);
            };

            p.windowResized = () => {
                p.resizeCanvas(window.innerWidth, window.innerHeight);
            };
        }, canvasRef.current);

        return () => sketch.remove();
    }, [isPlaying]);

    const handleStart = async () => {
        try {
            await Tone.start();
            console.log('Audio is ready');
            setHasStartedAudio(true);
            setIsPlaying(!isPlaying);
        } catch (error) {
            console.error('Error starting audio:', error);
        }
    };

    const handleAqiLevelChange = (level) => {
        loadAQData(aqiLevels[level].values);
    };

    const handlePollutantChange = async (pollutant, level) => {
        try {
            // Ensure audio context is started
            if (!hasStartedAudio) {
                await Tone.start();
                setHasStartedAudio(true);
            }

            // Update state
            loadAQData(prev => ({
                ...prev,
                [pollutant]: pollutantLevels[pollutant].levels[level].value
            }));

            // Play sound for the button
            if (buttonSynthRef.current && pollutantSounds[pollutant]) {
                const sound = pollutantSounds[pollutant][level];

                // Play each note of the chord with slight delay
                sound.notes.forEach((note, i) => {
                    buttonSynthRef.current.triggerAttackRelease(
                        note,
                        sound.length,
                        Tone.now() + i * 0.05,
                        0.3
                    );
                });

                // Log for debugging
                console.log(`Playing ${pollutant} ${level} sound:`, sound.notes);
            }
        } catch (error) {
            console.error('Error playing pollutant sound:', error);
        }
    };

    // Initialize synth
    useEffect(() => {
        if (!synthRef.current) {
            synthRef.current = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: 'triangle'
                },
                envelope: {
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 1
                }
            }).toDestination();
        }

        return () => {
            if (synthRef.current) {
                synthRef.current.dispose();
            }
        };
    }, []);

    // Initialize button synth
    useEffect(() => {
        if (!buttonSynthRef.current) {
            const reverb = new Tone.Reverb({
                decay: 2,
                wet: 0.3
            }).toDestination();

            buttonSynthRef.current = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: {
                    attack: 0.1,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 1
                },
                volume: -8
            }).connect(reverb);
        }

        return () => {
            if (buttonSynthRef.current) {
                buttonSynthRef.current.dispose();
            }
        };
    }, []);

    return (
        <div className="relative w-full h-screen bg-black">
            <div ref={canvasRef} className="absolute inset-0" />

            {/* Main controls */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                    onClick={handleStart}
                    className={`px-4 py-2 rounded-lg ${isPlaying ? 'bg-red-500' : 'bg-green-500'
                        } text-white`}
                >
                    {isPlaying ? 'Stop' : 'Start'}
                </button>
                <select
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white"
                >
                    <option value="HongKong">Hong Kong</option>
                    <option value="Bangkok">Bangkok</option>
                </select>
            </div>

            {/* AQI Level Controls */}
            <div className="absolute top-20 right-4 z-10 flex flex-col gap-2 bg-black bg-opacity-50 p-4 rounded-lg">
                <h3 className="text-white font-bold mb-2">Air Quality Levels</h3>
                {Object.entries(aqiLevels).map(([key, level]) => (
                    <button
                        key={key}
                        onClick={() => handleAqiLevelChange(key)}
                        className={`px-4 py-2 rounded-lg ${level.color} text-white 
                            ${aqData.aqius === level.values.aqius ? 'ring-2 ring-white' : ''}
                            hover:opacity-80 transition-opacity`}
                    >
                        {level.label} (AQI: {level.values.aqius})
                    </button>
                ))}
            </div>

            {/* Pollutant Controls with sound feedback */}
            <div className="absolute top-20 right-4 z-10 flex flex-col gap-4 bg-black bg-opacity-50 p-4 rounded-lg max-h-[80vh] overflow-y-auto">
                <h3 className="text-white font-bold">Pollutant Levels</h3>
                {Object.entries(pollutantLevels).map(([pollutant, data]) => (
                    <div key={pollutant} className="border-b border-gray-700 pb-4">
                        <h4 className="text-white mb-2">{data.name} ({data.unit})</h4>
                        <div className="flex flex-col gap-2">
                            {Object.entries(data.levels).map(([level, levelData]) => (
                                <button
                                    key={level}
                                    onClick={() => handlePollutantChange(pollutant, level)}
                                    className={`px-3 py-1 rounded-lg ${levelData.color} text-white text-sm
                                        ${aqData[pollutant] === levelData.value ? 'ring-2 ring-white' : ''}
                                        hover:opacity-80 transition-opacity`}
                                >
                                    {levelData.label} ({levelData.value} {data.unit})
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Current AQI Display */}
            <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 p-4 rounded-lg text-white">
                <h3 className="font-bold mb-2">Current Air Quality</h3>
                <p>AQI: {aqData.aqius}</p>
                <p className="mt-2">
                    Status: {
                        aqData.aqius <= 50 ? 'Good (Playing Melody)' :
                            aqData.aqius <= 100 ? 'Moderate' :
                                aqData.aqius <= 200 ? 'Unhealthy' :
                                    'Hazardous'
                    }
                </p>
            </div>

            {/* Current Levels Display */}
            <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-50 p-4 rounded-lg text-white">
                <h3 className="font-bold mb-2">Current Pollutant Levels</h3>
                {Object.entries(pollutantLevels).map(([pollutant, data]) => (
                    <p key={pollutant}>
                        {data.name}: {aqData[pollutant]} {data.unit}
                    </p>
                ))}
            </div>

        </div>
    );
};

export default AirMusicVisualizer;