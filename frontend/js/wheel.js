export function initWheel(){

    const button=document.getElementById("wheel-button");

    const overlay=document.getElementById("wheel-overlay");

    const close=document.getElementById("wheel-close");

    button.onclick=()=>{

        overlay.hidden=false;

    };

    close.onclick=()=>{

        overlay.hidden=true;

    };

    overlay.onclick=e=>{

        if(e.target===overlay){

            overlay.hidden=true;

        }

    };

}