import React, { useEffect, useRef, useState } from 'react';
import p5 from 'p5';
import * as Tone from 'tone';

const Airphonic = () => {
    const canvasRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentCity, setCurrentCity] = useState('HongKong');
    const [hasStartedAudio, setHasStartedAudio] = useState(false);
    const instrumentsRef = useRef({});
    const synthRef = useRef(null);
    const [aqData, setAqiData] = useState({
        aqius: 0,
        pm25: 0,
        pm10: 0,
        so2: 0,
        no2: 0,
        o3: 0,
        co: 0
    });


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
            // Remove the aqData.aqius check
            if (isPlaying && hasStartedAudio) {
                const music = cityMusic[currentCity];
                const now = Tone.now();

                // Play melody (every other step)
                if (step % 2 === 0) {
                    const melodyIndex = (step / 2) % music.melody.length;
                    instrumentsRef.current.melody.triggerAttackRelease(
                        music.melody[melodyIndex],
                        "8n",
                        now
                    );
                }

                // Play harmony (every four steps)
                if (step % 4 === 0) {
                    const harmonyIndex = (step / 4) % music.harmony.length;
                    instrumentsRef.current.harmony.triggerAttackRelease(
                        music.harmony[harmonyIndex],
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
    }, [isPlaying, hasStartedAudio, currentCity]);

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
                    if (aqData.aqius <= 50) {
                        p.fill(156, 216, 78, this.life);
                    } else if (aqData.aqius <= 100) {
                        p.fill(250, 207, 57, this.life);
                    } else if (aqData.aqius <= 150) {
                        p.fill(243, 114, 73, this.life);
                    } else if (aqData.aqius <= 200) {
                        p.fill(246, 94, 95, this.life);
                    } else if (aqData.aqius <= 300) {
                        p.fill(160, 112, 182, this.life);
                    } else {
                        p.fill(246, 94, 95, this.life);
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
                p.textSize(20);
                p.textFont('Arial');

                // Display basic information
                p.text(`Current City: ${currentCity}`, 20, 30);
                p.text(`AQI (US): ${aqData.aqius}`, 20, 60);
                p.text(`Playing: ${isPlaying ? 'Yes' : 'No'}`, 90);

                // Display current pollutant levels
                let yPosition = window.innerHeight - 50; // Starting y position for pollutants
                yPosition += 30; // Space between lines

                Object.entries(pollutantLevels).forEach(([pollutant, data]) => {
                    p.text(`${data.name}: ${aqData[pollutant]} ${data.unit}`, 20, yPosition);
                    yPosition -= 30; // Space between lines
                });
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

    const handlePollutantChange = async (pollutant, level) => {
        try {
            await Tone.start();
            if (Tone.context.state !== 'running') {
                await Tone.context.resume();
            }

            // Reinitialize button synth if it was disposed
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

            // Update pollutant value in aqData state
            setAqiData(prev => ({
                ...prev,
                [pollutant]: pollutantLevels[pollutant].levels[level].value
            }));

            // Play sound for the button
            if (buttonSynthRef.current && pollutantSounds[pollutant]) {
                const sound = pollutantSounds[pollutant][level];
                sound.notes.forEach((note, i) => {
                    buttonSynthRef.current.triggerAttackRelease(
                        note,
                        sound.length,
                        Tone.now() + i * 0.05,
                        0.3
                    );
                });

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
        const initButtonSynth = () => {
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
        };

        initButtonSynth();

        return () => {
            if (buttonSynthRef.current) {
                buttonSynthRef.current.dispose();
                buttonSynthRef.current = null; // Reset the ref after disposal
            }
        };
    }, []);

    // 1. New useEffect: Fetch data from server.js periodically
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`https://airphonic.onrender.com/api/get-latest?city=${currentCity}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const result = await response.json();
                // Map the returned array into your state object structure
                const formattedData = {
                    aqius: result.find(item => item.name === "aqius")?.value || aqData.aqius,
                    pm25: result.find(item => item.name === "pm25")?.value || aqData.pm25,
                    pm10: result.find(item => item.name === "pm10")?.value || aqData.pm10,
                    so2: result.find(item => item.name === "so2")?.value || aqData.so2,
                    no2: result.find(item => item.name === "no2")?.value || aqData.no2,
                    o3: result.find(item => item.name === "o3")?.value || aqData.o3,
                    co: result.find(item => item.name === "co")?.value || aqData.co,
                };
                setAqiData(formattedData);
            } catch (error) {
                console.error('Error fetching air quality data:', error);
            }
        };

        // initial fetch on mount and whenever currentCity changes
        fetchData();
        // refresh data every 60 seconds
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [currentCity]);

    return (
        <div className="relative w-full h-screen bg-black">
            <div ref={canvasRef} className="absolute inset-0" />

            {/* Main controls */}
            <div className="px-4 py-2 rounded-lg bg-gray-700 text-white">
                <button
                    onClick={handleStart}
                    className={`px-4 py-2 rounded-lg ${isPlaying ? 'bg-red-500' : 'bg-green-500'} text-white`}
                >
                    {isPlaying ? 'Stop' : 'Start'}
                </button>
                <select
                    value={currentCity}
                    onChange={(e) => setCurrentCity(e.target.value)}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-white"
                >
                    {Object.keys(cityMusic).map(city => (
                        <option key={city} value={city} className="bg-gray-700 text-white">
                            {city}
                        </option>
                    ))}
                </select>
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
        </div>
    );
};

export default Airphonic;