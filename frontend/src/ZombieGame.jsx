import { useEffect, useRef, useState, useCallback } from "react";

const W=480, H=480, PSPEED=3, BSPEED=7, Z_BASE=0.8;

function randEdge() {
  const s=Math.floor(Math.random()*4);
  if(s===0) return {x:Math.random()*W,y:0};
  if(s===1) return {x:W,y:Math.random()*H};
  if(s===2) return {x:Math.random()*W,y:H};
  return {x:0,y:Math.random()*H};
}

export default function ZombieGame({ onGameOver, highScore }) {
  const canvasRef = useRef(null);
  const [status, setStatus] = useState("ready");
  const [score, setScore] = useState(0);
  const stateRef = useRef(null);
  const keysRef = useRef({});

  const initState = useCallback(() => ({
    player:{x:W/2,y:H/2,hp:5,angle:0},
    bullets:[], zombies:[],
    score:0, wave:1, zombiesLeft:5, lastShot:0, waveTimer:0,
  }), []);

  function draw() {
    const canvas=canvasRef.current;
    if(!canvas||!stateRef.current) return;
    const ctx=canvas.getContext("2d");
    const s=stateRef.current;
    ctx.fillStyle="#0a0000"; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,68,68,0.05)";
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    s.bullets.forEach(b=>{
      ctx.fillStyle="#ffff00";ctx.shadowColor="#ffff00";ctx.shadowBlur=8;
      ctx.beginPath();ctx.arc(b.x,b.y,3,0,Math.PI*2);ctx.fill();
    });

    s.zombies.forEach(z=>{
      ctx.fillStyle="#00ff00";ctx.shadowColor="#00ff00";ctx.shadowBlur=6;
      ctx.fillRect(z.x-10,z.y-10,20,20);
      ctx.fillStyle="#330000";ctx.fillRect(z.x-10,z.y-16,20,3);
      ctx.fillStyle="#00ff00";ctx.fillRect(z.x-10,z.y-16,20*(z.hp/3),3);
    });

    ctx.save();
    ctx.translate(s.player.x,s.player.y);ctx.rotate(s.player.angle);
    ctx.fillStyle="#ff4444";ctx.shadowColor="#ff4444";ctx.shadowBlur=15;
    ctx.fillRect(-10,-10,20,20);
    ctx.fillStyle="#ffaa00";ctx.fillRect(0,-3,18,6);
    ctx.restore();ctx.shadowBlur=0;

    for(let i=0;i<5;i++){
      ctx.fillStyle=i<s.player.hp?"#ff4444":"#330000";
      ctx.fillRect(8+i*22,8,16,16);
    }
    ctx.fillStyle="#ff4444";ctx.font="bold 14px monospace";
    ctx.fillText(`WAVE ${s.wave}`,W-90,22);
    ctx.shadowBlur=0;
  }

  useEffect(()=>{
    if(status!=="playing"){draw();return;}
    let raf,last=0;
    function tick(ts){
      const s=stateRef.current;
      const k=keysRef.current;
      const dt=ts-last;last=ts;
      if(k["w"]||k["W"]) s.player.y=Math.max(12,s.player.y-PSPEED);
      if(k["s"]||k["S"]) s.player.y=Math.min(H-12,s.player.y+PSPEED);
      if(k["a"]||k["A"]) s.player.x=Math.max(12,s.player.x-PSPEED);
      if(k["d"]||k["D"]) s.player.x=Math.min(W-12,s.player.x+PSPEED);

      let nearest=null,minD=Infinity;
      s.zombies.forEach(z=>{
        const d=Math.hypot(z.x-s.player.x,z.y-s.player.y);
        if(d<minD){minD=d;nearest=z;}
      });
      if(nearest){
        s.player.angle=Math.atan2(nearest.y-s.player.y,nearest.x-s.player.x);
        if(ts-s.lastShot>400){
          s.lastShot=ts;
          s.bullets.push({
            x:s.player.x+Math.cos(s.player.angle)*16,
            y:s.player.y+Math.sin(s.player.angle)*16,
            vx:Math.cos(s.player.angle)*BSPEED,
            vy:Math.sin(s.player.angle)*BSPEED,
          });
        }
      }

      s.bullets=s.bullets.filter(b=>b.x>0&&b.x<W&&b.y>0&&b.y<H);
      s.bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;});

      s.waveTimer+=dt;
      if(s.zombiesLeft>0&&s.waveTimer>1500){
        s.waveTimer=0;s.zombiesLeft--;
        const pos=randEdge();
        s.zombies.push({...pos,hp:3,speed:Z_BASE+s.wave*0.15});
      }

      s.zombies.forEach(z=>{
        const a=Math.atan2(s.player.y-z.y,s.player.x-z.x);
        z.x+=Math.cos(a)*z.speed;z.y+=Math.sin(a)*z.speed;
      });

      s.bullets=s.bullets.filter(b=>{
        let hit=false;
        s.zombies=s.zombies.map(z=>{
          if(!hit&&Math.hypot(b.x-z.x,b.y-z.y)<14){
            hit=true;z.hp--;
            if(z.hp<=0){s.score+=10*s.wave;setScore(s.score);return null;}
          }
          return z;
        }).filter(Boolean);
        return !hit;
      });

      let dead=false;
      s.zombies.forEach(z=>{
        if(Math.hypot(z.x-s.player.x,z.y-s.player.y)<18){
          s.player.hp--;
          const pos=randEdge();z.x=pos.x;z.y=pos.y;
          if(s.player.hp<=0)dead=true;
        }
      });
      if(dead){setStatus("over");onGameOver(s.score);return;}

      if(s.zombiesLeft===0&&s.zombies.length===0){
        s.wave++;s.zombiesLeft=5+s.wave*2;s.waveTimer=0;
        s.player.hp=Math.min(5,s.player.hp+1);
      }

      draw();raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[status]);

  useEffect(()=>{
    function down(e){
      keysRef.current[e.key]=true;
      if(status!=="playing"&&e.code==="Space")startGame();
    }
    function up(e){keysRef.current[e.key]=false;}
    window.addEventListener("keydown",down);
    window.addEventListener("keyup",up);
    return ()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  },[status]);

  function startGame(){stateRef.current=initState();setScore(0);setStatus("playing");}

  return (
    <div className="game-wrap">
      <div className="game-hud">
        <span>SCORE {String(score).padStart(6,"0")}</span>
        <span>BEST {String(highScore).padStart(6,"0")}</span>
      </div>
      <div className="canvas-shell">
        <canvas ref={canvasRef} width={W} height={H} style={{width:"100%",height:"100%",display:"block"}} />
        {status!=="playing"&&(
          <div className="overlay">
            {status==="ready"&&(<>
              <p className="overlay-title">ZOMBIE.EXE</p>
              <p className="overlay-sub">WASD to move · auto-aim & shoot · survive waves!</p>
              <button className="btn" onClick={startGame}>▶ PRESS START</button>
            </>)}
            {status==="over"&&(<>
              <p className="overlay-title">YOU DIED</p>
              <p className="overlay-sub">final score: {score}</p>
              <button className="btn" onClick={startGame}>↻ PLAY AGAIN</button>
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}