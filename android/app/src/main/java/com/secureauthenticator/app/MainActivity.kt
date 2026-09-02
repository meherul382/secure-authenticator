package com.secureauthenticator.app

import android.os.Bundle
import android.widget.*
import androidx.appcompat.app.AppCompatActivity
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.nio.ByteBuffer
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import java.util.Base64
import kotlin.math.floor

class MainActivity : AppCompatActivity() {
    data class Account(val name:String,val issuer:String,val secret:String)
    private lateinit var store: android.content.SharedPreferences
    private val accounts=mutableListOf<Account>()
    private lateinit var list: LinearLayout
    private val handler=android.os.Handler(mainLooper)
    private val ticker=object:Runnable{override fun run(){render();handler.postDelayed(this,1000)}}

    override fun onCreate(savedInstanceState:Bundle?){super.onCreate(savedInstanceState);setContentView(R.layout.activity_main)
        list=findViewById(R.id.accountList)
        val key=MasterKey.Builder(this).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
        store=EncryptedSharedPreferences.create(this,"secure_accounts",key,EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM)
        load();findViewById<Button>(R.id.addButton).setOnClickListener{dialog()};findViewById<Button>(R.id.importButton).setOnClickListener{uriDialog()};render()
    }
    override fun onResume(){super.onResume();handler.post(ticker)}
    override fun onPause(){handler.removeCallbacks(ticker);super.onPause()}

    private fun load(){val raw=store.getString("accounts","")? : "";if(raw.isBlank())return;raw.split("\\n").forEach{p->val x=p.split("|",limit=3);if(x.size==3)accounts.add(Account(x[0],x[1],x[2]))}}
    private fun save(){store.edit().putString("accounts",accounts.joinToString("\\n"){ "${it.name}|${it.issuer}|${it.secret}" }).apply()}
    private fun render(){list.removeAllViews();accounts.forEachIndexed{idx,a->val box=LinearLayout(this);box.orientation=LinearLayout.VERTICAL;box.setPadding(14,14,14,14);val name=TextView(this);name.text="${a.name}  •  ${a.issuer}";name.textSize=16f;name.setTypeface(null,1);val code=TextView(this);code.text=try{totp(a.secret)}catch(_:Exception){"------"};code.textSize=34f;code.setPadding(0,8,0,2);val remain=TextView(this);val left=30-(System.currentTimeMillis()/1000%30);remain.text="Refreshes in ${left}s";val del=Button(this);del.text="Delete";del.setOnClickListener{accounts.removeAt(idx);save();render()};box.addView(name);box.addView(code);box.addView(remain);box.addView(del);list.addView(box)} }
    private fun dialog(){val layout=LinearLayout(this);layout.orientation=LinearLayout.VERTICAL;val name=EditText(this);name.hint="Account name";val issuer=EditText(this);issuer.hint="Issuer (Google, Facebook...)";val secret=EditText(this);secret.hint="TOTP secret key";layout.addView(name);layout.addView(issuer);layout.addView(secret);AlertDialog.Builder(this).setTitle("Add authenticator account").setView(layout).setNegativeButton("Cancel",null).setPositiveButton("Add"){_,_->val s=secret.text.toString().replace(" ","").uppercase();if(s.isNotBlank()){accounts.add(Account(name.text.toString().ifBlank{"Account"},issuer.text.toString().ifBlank{"Authenticator"},s));save();render()}}.show()}
    private fun uriDialog(){val input=EditText(this);input.hint="otpauth://totp/...";AlertDialog.Builder(this).setTitle("Import TOTP URI").setView(input).setNegativeButton("Cancel",null).setPositiveButton("Import"){_,_->parseUri(input.text.toString())}.show()}
    private fun parseUri(raw:String){try{val u=android.net.Uri.parse(raw);if(u.scheme!="otpauth"||u.host!="totp")return;val label=java.net.URLDecoder.decode(u.path?.removePrefix("/")?:"Account","UTF-8");val parts=label.split(":",limit=2);val name=parts.last();val issuer=u.getQueryParameter("issuer")?:parts.firstOrNull()? : "Authenticator";val secret=u.getQueryParameter("secret")?:return;accounts.add(Account(name,issuer,secret.replace(" ","").uppercase()));save();render()}catch(_:Exception){Toast.makeText(this,"Invalid TOTP URI",Toast.LENGTH_SHORT).show()}}
    private fun totp(secret:String):String{val key=Base64.getDecoder().decode(base32(secret));val counter=System.currentTimeMillis()/1000/30;val data=ByteBuffer.allocate(8).putLong(counter).array();val mac=Mac.getInstance("HmacSHA1");mac.init(SecretKeySpec(key,"HmacSHA1"));val hash=mac.doFinal(data);val o=hash.last().toInt() and 15;var n=0L;for(i in 0..3)n=(n shl 8)+(hash[o+i].toInt() and 255);n=n and 0x7fffffff;return String.format("%06d",n%1000000)}
    private fun base32(s:String):ByteArray{val alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";var buffer=0;var bits=0;val out=java.io.ByteArrayOutputStream();s.filter{it!='='}.uppercase().forEach{val v=alphabet.indexOf(it);if(v<0)return@forEach;buffer=(buffer shl 5) or v;bits+=5;if(bits>=8){bits-=8;out.write((buffer shr bits) and 255);buffer=buffer and ((1 shl bits)-1)}};return out.toByteArray()}
}
