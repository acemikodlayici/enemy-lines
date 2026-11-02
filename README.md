# ENEMY LINES — GitHub Pages + Render

Bu paket, oyun istemcisini GitHub Pages'te ve gerçek zamanlı WebSocket sunucusunu Render Web Service üzerinde yayınlamak için hazırlanmıştır.

## Mimari
- `public/`: GitHub Pages üzerinde yayınlanan HTML/CSS/JS oyun istemcisi.
- `server.js`: Render üzerinde çalışan Node.js + WebSocket sunucusu.
- `public/config.js`: Render sunucusunun WSS adresi burada tanımlanır.
- `.github/workflows/pages.yml`: `main` dalına push yapıldığında `public/` klasörünü otomatik GitHub Pages'e yayınlar.
- `render.yaml`: Render sunucu ayarları.

## 1. GitHub'a yükle
1. GitHub'da `enemy-lines` adında yeni bir **Public** repository oluştur.
2. ZIP içeriğini bilgisayarında çıkar.
3. İçindeki tüm dosya ve klasörleri repository'nin ana dizinine yükle. `.github` klasörünün de yüklendiğinden emin ol.
4. Değişiklikleri `main` dalına commit et.

Terminal ile:
```bash
git init
git add .
git commit -m "Initial ENEMY LINES prototype"
git branch -M main
git remote add origin https://github.com/GITHUB_KULLANICI_ADIN/enemy-lines.git
git push -u origin main
```

## 2. Render üzerinde online oyun sunucusunu aç
1. https://render.com adresinde hesap oluştur ve GitHub hesabını bağla.
2. Render Dashboard > New > Blueprint seç.
3. `enemy-lines` repository'sini seç. Render `render.yaml` dosyasını okuyacaktır.
   Alternatif olarak New > Web Service seçip şu ayarları gir:
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
   - Plan: Free (deneme için)
4. Deploy tamamlanınca Render sana `https://enemy-lines-server.onrender.com` benzeri bir adres verir.

## 3. İstemciyi sunucuya bağla
GitHub repository'sindeki `public/config.js` dosyasını aç ve şu satırı gerçek Render adresinle değiştir:

```js
window.ARENA_WS_URL = "wss://enemy-lines-server.onrender.com/ws";
```

`YOUR-RENDER-SERVICE` yer tutucusunu bırakma. Değişikliği commit et. GitHub Actions otomatik olarak Pages'i yeniden yayınlayacaktır.

## 4. GitHub Pages'i etkinleştir
1. GitHub repository > Settings > Pages.
2. Build and deployment bölümünde Source olarak **GitHub Actions** seç.
3. Actions sekmesindeki `Publish game to GitHub Pages` iş akışının tamamlanmasını bekle.
4. Pages sayfasında gösterilen `https://KULLANICI_ADI.github.io/enemy-lines/` adresinden oyunu aç.

## 5. Online test
- Oyunu iki ayrı tarayıcı sekmesinde aç.
- İki sekme aynı Render sunucusuna bağlanır ve farklı takımlara atanır.
- Başka kişiler de GitHub Pages bağlantısından katılabilir.

## Render Free plan notu
Ücretsiz Render web servisleri 15 dakika etkinlik olmazsa uykuya geçebilir. Sonraki bağlantıda tekrar başlaması biraz zaman alabilir. Gerçek zamanlı oyun için sürekli açık ücretli bir sunucu veya kendi VPS'in daha iyi deneyim sağlar. Render WebSocket bağlantılarını destekler; internet üzerinden `wss://` kullanılır.

## Kontroller
- WASD: hareket
- Shift: koşma
- Fare: nişan
- Sol tık: ok atma

## Bu sürümün sınırları
Bu hâlâ teknik prototiptir. Kullanıcı hesabı, şifreleme, PostgreSQL, oda/eşleştirme, 5v5 sınırı, tur ekonomisi, kale hedefi, farklı silahlar, gerçek sprite animasyonları, anti-cheat sertleştirmesi ve gelişmiş gecikme telafisi henüz yoktur. Sunucu şu an tek bir süreç ve bellekte tutulan geçici maç durumuyla çalışır; yeniden başlatmada maç sıfırlanır.
