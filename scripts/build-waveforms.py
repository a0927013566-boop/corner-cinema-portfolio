"""Rebuild compact RMS envelopes from the authorized local MP3s; requires ffmpeg."""
import array,json,math,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parent.parent
path=root/'data/music.json';tracks=json.loads(path.read_text())
for track in tracks:
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(root/track['src']),'-ac','1','-ar','2000','-f','f32le','-'])
    values=array.array('f');values.frombytes(raw)
    if sys.byteorder!='little':values.byteswap()
    samples=[]
    for i in range(64):
        part=values[i*len(values)//64:(i+1)*len(values)//64]
        samples.append(math.sqrt(sum(v*v for v in part)/max(1,len(part))))
    peak=max(samples) or 1
    track['waveform']=[round(v/peak,3) for v in samples]
path.write_text(json.dumps(tracks,ensure_ascii=False,indent=2)+'\n')
print(f'{len(tracks)} real audio envelopes, 64 RMS bins each')
