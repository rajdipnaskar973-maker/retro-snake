import { useEffect, useRef, useState } from "react";

const W=480,H=480,TSPEED=2.5,BSPEED=6,TSIZE=14;

export default function TankGame({ onGameOver, highScore }) {
  const canvasRef=useRef(null);
  const [status,setStatus]=useState("ready");
  const [score,setScore]=useState({p1:0,p2:0});
  const stateRef=useRef(null);
  const keysRef=useRef({});

  function initState(){
    return {
      p1:{x:80,y:H/2,angle:0,hp:5,color:"#ff4444",cooldown:0},
      p2:{x:W-80,y:H/2,angle:Math.PI,hp:5,color:"#4488ff",cooldown:0},
      bullets:[],score:{p1:0,p2:0},
    };
  }

  function draw(){
    const canvas=canvasRef.current;
    if(!canvas||!stateRef.current)return;
    const ctx=canvas.getContext("2d");
    const s=stateRef.current;
    ctx.fillStyle="#0a0000";ctx.fillRect(0,0,W,H);
    ctx.strokeStyle="rgba(255,68,68,0.05)";
    for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    function drawTank(t){
      ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.angle);
      ctx.fillStyle=t.color;ctx.shadowColor=t.color;ctx.shadowBlur=12;
      ctx.fillRect(-TSIZE,-TSIZE/2,TSIZE*2,TSIZE);
      ctx.fillRect(0,-4,TSIZE+6,8);
      ctx.restore();ctx.shadowBlur=0;
      ctx.fillStyle="#330000";ctx.fillRect(t.x-20,t.y-TSIZE-10,40,5);
      ctx.fillStyle=t.color;ctx.fillRect(t.x-20,t.y-TSIZE-10,40*(t.hp/5),5);
    }

    s.bullets.forEach(b=>{
      ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=8;
      ctx.beginPath();ctx.arc(b.x,b.y,4,0,Math.PI*2);ctx.fill();
    });
    ctx.shadowBlur=0;
    drawTank(s.p1);drawTank(s.p2);

    ctx.font="bold 16px monospace";
    ctx.fillStyle=s.p1.color;ctx.fillText(`P1: ${s.score.p1}`,12,22);
    ctx.fillStyle=s.p2.color;ctx.fillText(`P2: ${s.score.p2}`,W-80,22);
  }

  useEffect(()=>{
    if(status!=="playing"){draw();return;}
    let raf,last=0;
    function tick(ts){
      const dt=ts-last;last=ts;
      const s=stateRef.current;
      const k=keysRef.current;

      if(k["a"]||k["A"])s.p1.angle-=0.04;
      if(k["d"]||k["D"])s.p1.angle+=0.04;
      if(k["w"]||k["W"]){s.p1.x+=Math.cos(s.p1.angle)*TSPEED;s.p1.y+=Math.sin(s.p1.angle)*TSPEED;}
      if(k["s"]||k["S"]){s.p1.x-=Math.cos(s.p1.angle)*TSPEED;s.p1.y-=Math.sin(s.p1.angle)*TSPEED;}
      s.p1.x=Math.max(TSIZE,Math.min(W-TSIZE,s.p1.x));
      s.p1.y=Math.max(TSIZE,Math.min(H-TSIZE,s.p1.y));

      if(k["ArrowLeft"])s.p2.angle-=0.04;
      if(k["ArrowRight"])s.p2.angle+=0.04;
      if(k["ArrowUp"]){s.p2.x+=Math.cos(s.p2.angle)*TSPEED;s.p2.y+=Math.sin(s.p2.angle)*TSPEED;}
      if(k["ArrowDown"]){s.p2.x-=Math.cos(s.p2.angle)*TSPEED;s.p2.y-=Math.sin(s.p2.angle)*TSPEED;}
      s.p2.x=Math.max(TSIZE,Math.min(W-TSIZE,s.p2.x));
      s.p2.y=Math.max(TSIZE,Math.min(H-TSIZE,s.p2.y));

      s.p1.cooldown-=dt;s.p2.cooldown-=dt;
      if(k["f"]&&s.p1.cooldown<=0){
        s.p1.cooldown=500;
        s.bullets.push({x:s.p1.x+Math.cos(s.p1.angle)*22,y:s.p1.y+Math.sin(s.p1.angle)*22,
          vx:Math.cos(s.p1.angle)*BSPEED,vy:Math.sin(s.p1.angle)*BSPEED,owner:"p1",color:"#ff4444"});
      }
      if(k["Enter"]&&s.p2.cooldown<=0){
        s.p2.cooldown=500;
        s.bullets.push({x:s.p2.x+Math.cos(s.p2.angle)*22,y:s.p2.y+Math.sin(s.p2.angle)*22,
          vx:Math.cos(s.p2.angle)*BSPEED,vy:Math.sin(s.p2.angle)*BSPEED,owner:"p2",color:"#4488ff"});
      }

      s.bullets=s.bullets.filter(b=>b.x>0&&b.x<W&&b.y>0&&b.y<H);
      s.bullets.forEach(b=>{b.x+=b.vx;b.y+=b.vy;});

      s.bullets=s.bullets.filter(b=>{
        if(b.owner==="p1"&&Math.hypot(b.x-s.p2.x,b.y-s.p2.y)<TSIZE+4){
          s.p2.hp--;s.score.p1++;setScore({...s.score});
          if(s.p2.hp<=0){setStatus("over");onGameOver(s.score.p1*100);}
          return false;
        }
        if(b.owner==="p2"&&Math.hypot(b.x-s.p1.x,b.y-s.p1.y)<TSIZE+4){
          s.p1.hp--;s.score.p2++;setScore({...s.score});
          if(s.p1.hp<=0){setStatus("over");onGameOver(s.score.p2*100);}
          return false;
        }
        return true;
      });

      draw();raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(raf);
  },[status]);

  useEffect(()=>{
    function down(e){
      keysRef.current[e.key]=true;
      if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
      if(status!=="playing"&&e.code==="Space")startGame();
    }
    function up(e){keysRef.current[e.key]=false;}
    window.addEventListener("keydown",down);
    window.addEventListener("keyup",up);
    return ()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  },[status]);

  function startGame(){stateRef.current=initState();setScore({p1:0,p2:0});setStatus("playing");}

  return (
    <div className="game-wrap">
      <div className="game-hud">
        <span style={{color:"#ff4444"}}>P1: {score.p1} hits</span>
        <span style={{color:"#4488ff"}}>P2: {score.p2} hits</span>
      </div>
      <div className="canvas-shell">
        <canvas ref={canvasRef} width={W} height={H} style={{width:"100%",height:"100%",display:"block"}} />
        {status!=="playing"&&(
          <div className="overlay">
            {status==="ready"&&(<>
              <p className="overlay-title">TANK.EXE</p>
              <p className="overlay-sub" style={{color:"#ff4444"}}>P1: WASD move · F shoot</p>
              <p className="overlay-sub" style={{color:"#4488ff"}}>P2: Arrows move · Enter shoot</p>
              <button className="btn" onClick={startGame}>▶ PRESS START</button>
            </>)}
            {status==="over"&&(<>
              <p className="overlay-title">GAME OVER</p>
              <p className="overlay-sub">P1: {score.p1} | P2: {score.p2}</p>
              <button className="btn" onClick={startGame}>↻ PLAY AGAIN</button>
            </>)}
          </div>
        )}
      </div>
    </div>
  );
}