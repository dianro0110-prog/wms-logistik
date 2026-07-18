"use client";

import {
  Eye,
  EyeOff,
  ArrowRight,
  LogIn,
  Package
} from "lucide-react";


export default function MobileLogin({

  email,
  setEmail,

  password,
  setPassword,

  showPassword,
  setShowPassword,

  loading,
  error,

  handleLogin

}:any){


return (

<div

style={{

minHeight:"100vh",

background:"#edf3ef",

display:"flex",

justifyContent:"center",

alignItems:"center",

padding:"25px"

}}

>


<div

style={{

width:"100%",

maxWidth:"420px",

background:"#fff",

borderRadius:"20px",

padding:"35px",

boxShadow:"0 10px 35px rgba(0,0,0,.12)"

}}

>



<div

style={{

display:"flex",

justifyContent:"center",

marginBottom:"20px"

}}

>


<div

style={{

width:"70px",

height:"70px",

borderRadius:"15px",

background:"#03163f",

color:"#fff",

display:"flex",

alignItems:"center",

justifyContent:"center"

}}

>

<Package size={35}/>


</div>


</div>





<h1

style={{

textAlign:"center",

fontSize:"28px",

fontWeight:"bold",

color:"#111827"

}}

>

WMS Login

</h1>





<p

style={{

textAlign:"center",

color:"#6b7280",

marginTop:"10px",

marginBottom:"30px"

}}

>

Warehouse Management System

</p>






{

error &&

<div

style={{

background:"#fee2e2",

color:"#dc2626",

padding:"12px",

borderRadius:"10px",

marginBottom:"20px",

fontSize:"14px"

}}

>

{error}


</div>

}








<form onSubmit={handleLogin}>


<label

style={{

fontWeight:"600",

display:"block",

marginBottom:"8px"

}}

>

Email

</label>



<input


type="email"


placeholder="Masukkan email"


value={email}


onChange={(e)=>
setEmail(e.target.value)
}


style={{

width:"100%",

padding:"14px",

borderRadius:"10px",

border:"1px solid #d1d5db",

fontSize:"15px",

boxSizing:"border-box",

marginBottom:"20px"

}}


/>








<label

style={{

fontWeight:"600",

display:"block",

marginBottom:"8px"

}}

>

Password

</label>





<div

style={{

position:"relative"

}}

>


<input


type={

showPassword

?

"text"

:

"password"

}



placeholder="Masukkan password"



value={password}



onChange={(e)=>
setPassword(e.target.value)
}



style={{

width:"100%",

padding:"14px",

paddingRight:"50px",

borderRadius:"10px",

border:"1px solid #d1d5db",

fontSize:"15px",

boxSizing:"border-box"

}}



/>





<button


type="button"



onClick={()=>setShowPassword(!showPassword)}



style={{

position:"absolute",

right:"15px",

top:"50%",

transform:"translateY(-50%)",

background:"transparent",

border:"none",

cursor:"pointer"

}}


>



{

showPassword

?

<EyeOff size={20}/>

:

<Eye size={20}/>

}


</button>



</div>









<button


type="submit"


disabled={loading}



style={{

marginTop:"30px",

width:"100%",

padding:"15px",

background:"#03163f",

color:"#fff",

border:"none",

borderRadius:"10px",

fontSize:"16px",

fontWeight:"bold",

display:"flex",

alignItems:"center",

justifyContent:"center",

gap:"10px",

cursor:"pointer"

}}



>


{

loading

?

"Loading..."

:

"Masuk"

}


{

!loading &&

<ArrowRight size={18}/>

}



</button>







</form>







<div

style={{

marginTop:"30px",

textAlign:"center",

fontSize:"13px",

color:"#777"

}}

>

🔒 Secure Login WMS

</div>





</div>


</div>


);


}