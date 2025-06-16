// Database Auth Service - Prisma ile gerçek veritabanı bağlantısı
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// 🔐 Login Authentication
export async function authenticateUser(email, password) {
  try {
    console.log('🔍 Login attempt for:', email)
    
    // Gerçek database kontrolü
    const user = await prisma.kullanici.findFirst({
      where: { email },
      include: {
        firma: true
      }
    })
    
    if (!user) {
      console.log('❌ User not found:', email)
      return { success: false, error: 'Kullanıcı bulunamadı' }
    }
    
    if (!user.aktif) {
      console.log('❌ User deactivated:', email)
      return { success: false, error: 'Hesap deaktive edilmiş' }
    }
    
    // Şifre kontrolü
    const passwordMatch = await bcrypt.compare(password, user.sifreHash)
    
    if (!passwordMatch) {
      console.log('❌ Password mismatch for:', email)
      return { success: false, error: 'Şifre hatalı' }
    }
    
    // Son giriş zamanını güncelle
    await prisma.kullanici.update({
      where: { id: user.id },
      data: { sonGiris: new Date() }
    })
    
    console.log('✅ Login successful for:', email, 'Role:', user.rol)
    
    return {
      success: true,
      user: {
        id: user.id,
        ad: user.ad,
        soyad: user.soyad,
        email: user.email,
        rol: user.rol,
        firma_id: user.firmaId,
        firma_adi: user.firma?.ad || 'Bilinmiyor',
        tc_no: user.tcNo,
        telefon: user.telefon
      }
    }
    
  } catch (error) {
    console.error('💥 Database auth error:', error)
    return { success: false, error: 'Sistem hatası' }
  }
}

// 👥 Yeni Kullanıcı Oluştur (Firma tarafından öğrenci eklemek için)
export async function createUser(userData) {
  try {
    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(userData.sifre, 12)
    
    const newUser = await prisma.kullanici.create({
      data: {
        firmaId: userData.firmaId,
        ad: userData.ad,
        soyad: userData.soyad,
        email: userData.email,
        telefon: userData.telefon || null, // Opsiyonel
        rol: userData.rol,
        sifreHash: hashedPassword,
        tcNo: userData.tcNo || null, // Opsiyonel
        dogumTarihi: userData.dogumTarihi || null, // Opsiyonel
      },
      include: {
        firma: true
      }
    })
    
    console.log('✅ User created:', newUser.email)
    
    return {
      success: true,
      user: {
        id: newUser.id,
        ad: newUser.ad,
        soyad: newUser.soyad,
        email: newUser.email,
        rol: newUser.rol,
        firma_adi: newUser.firma.ad
      }
    }
    
  } catch (error) {
    console.error('💥 Create user error:', error)
    
    if (error.code === 'P2002') {
      return { success: false, error: 'Bu email adresi zaten kullanımda' }
    }
    
    return { success: false, error: 'Kullanıcı oluşturulamadı' }
  }
}

// 👥 Firma Kullanıcılarını Listele
export async function getUsersByFirma(firmaId) {
  try {
    const users = await prisma.kullanici.findMany({
      where: { 
        firmaId: firmaId
      },
      select: {
        id: true,
        ad: true,
        soyad: true,
        email: true,
        telefon: true,
        rol: true,
        aktif: true,
        tcNo: true,
        dogumTarihi: true,
        sinavSayisi: true,
        basariOrani: true,
        olusturmaTarihi: true,
        sonGiris: true
      },
      orderBy: { olusturmaTarihi: 'desc' }
    })
    
    return users
    
  } catch (error) {
    console.error('💥 Get users by firma error:', error)
    return []
  }
}

// 👥 Kullanıcı Bilgilerini Getir
export async function getUserById(userId) {
  try {
    const user = await prisma.kullanici.findUnique({
      where: { id: userId },
      include: {
        firma: true
      }
    })
    
    if (!user) return null
    
    return {
      id: user.id,
      ad: user.ad,
      soyad: user.soyad,
      email: user.email,
      telefon: user.telefon,
      rol: user.rol,
      firma_id: user.firmaId,
      firma_adi: user.firma.ad,
      tc_no: user.tcNo,
      dogum_tarihi: user.dogumTarihi,
      sinav_sayisi: user.sinavSayisi,
      basari_orani: user.basariOrani,
      sinav_istatistikleri: {
        toplam_sinav: user.sinavSayisi,
        ortalama_puan: Math.round(user.basariOrani),
        en_yuksek_puan: 95, // TODO: Gerçek data
        basarili_sinav: Math.floor(user.sinavSayisi * (user.basariOrani / 100))
      },
      hedefler: {
        haftalik_sinav: { tamamlanan: 3, hedef: 5 },
        aylık_ai_soru: { tamamlanan: 8, hedef: 10 },
        kitap_okuma: { tamamlanan: 2, hedef: 3 }
      }
    }
    
  } catch (error) {
    console.error('💥 Get user error:', error)
    return null
  }
}

// 🏢 Firma Bilgilerini Getir
export async function getFirmaById(firmaId) {
  try {
    const firma = await prisma.firma.findUnique({
      where: { id: firmaId }
    })
    
    return firma ? {
      id: firma.id,
      ad: firma.ad,
      logo: firma.logoUrl,
      tema_rengi: firma.temaRengi,
      paket_tipi: firma.paketTipi,
      ai_destegi: firma.aiDestegi
    } : null
    
  } catch (error) {
    console.error('💥 Get firma error:', error)
    return null
  }
}

// 📝 Sorular Getir
export async function getSorular(firmaId = null, limit = 20) {
  try {
    const sorular = await prisma.soru.findMany({
      where: {
        OR: [
          { firmaId: null }, // Genel sorular
          { firmaId: firmaId } // Firmaya özel sorular
        ],
        aktif: true
      },
      take: limit,
      orderBy: { olusturmaTarihi: 'desc' }
    })
    
    return sorular.map(soru => ({
      id: soru.id,
      soru: soru.soru,
      cevaplar: soru.cevaplar,
      dogru_cevap: soru.dogruCevap,
      kategori: soru.kategori,
      zorluk: soru.zorluk,
      premium_icerik: soru.premiumIcerik
    }))
    
  } catch (error) {
    console.error('💥 Get sorular error:', error)
    return []
  }
}

// 📚 Kitaplar Getir
export async function getKitaplar(firmaId = null) {
  try {
    const kitaplar = await prisma.kitap.findMany({
      where: {
        OR: [
          { firmaId: null }, // Genel kitaplar
          { firmaId: firmaId } // Firmaya özel kitaplar
        ],
        aktif: true
      },
      include: {
        bolumler: {
          orderBy: { sira: 'asc' }
        }
      }
    })
    
    return kitaplar.map(kitap => ({
      id: kitap.id,
      baslik: kitap.baslik,
      aciklama: kitap.aciklama,
      ikon: kitap.ikon,
      renk: kitap.renk,
      sayfa_sayisi: kitap.sayfaSayisi,
      okuma_suresi: kitap.okumaSuresi,
      premium_icerik: kitap.premiumIcerik,
      bolumler: kitap.bolumler.map(bolum => ({
        id: bolum.id,
        baslik: bolum.baslik,
        icerik: bolum.icerik,
        sira: bolum.sira
      }))
    }))
    
  } catch (error) {
    console.error('💥 Get kitaplar error:', error)
    return []
  }
}

// 📢 Duyurular Getir
export async function getDuyurular(firmaId, userRole) {
  try {
    const duyurular = await prisma.duyuru.findMany({
      where: {
        firmaId: firmaId,
        aktif: true,
        hedefRoller: {
          has: userRole
        }
      },
      include: {
        olusturan: {
          select: {
            ad: true,
            soyad: true
          }
        }
      },
      orderBy: { olusturmaTarihi: 'desc' }
    })
    
    return duyurular.map(duyuru => ({
      id: duyuru.id,
      baslik: duyuru.baslik,
      icerik: duyuru.icerik,
      oncelik: duyuru.oncelik,
      tarih: duyuru.olusturmaTarihi,
      olusturan: `${duyuru.olusturan.ad} ${duyuru.olusturan.soyad}`
    }))
    
  } catch (error) {
    console.error('💥 Get duyurular error:', error)
    return []
  }
}

// 🆔 Aktivasyon Kodu Kontrol Et
export async function checkAktivasyonKodu(kod) {
  try {
    const aktivasyonKodu = await prisma.aktivasyonKodu.findUnique({
      where: { kod }
    })
    
    if (!aktivasyonKodu) {
      return { success: false, error: 'Kod bulunamadı' }
    }
    
    if (aktivasyonKodu.kullanildi) {
      return { success: false, error: 'Kod daha önce kullanılmış' }
    }
    
    if (aktivasyonKodu.gecerlilikTarihi && aktivasyonKodu.gecerlilikTarihi < new Date()) {
      return { success: false, error: 'Kod süresi dolmuş' }
    }
    
    return {
      success: true,
      paketTipi: aktivasyonKodu.paketTipi,
      sureGun: aktivasyonKodu.sureGun
    }
    
  } catch (error) {
    console.error('💥 Check activation code error:', error)
    return { success: false, error: 'Sistem hatası' }
  }
}

// 🏢 SUPER ADMIN FONKSİYONLARI

// Tüm firmaları listele (Super Admin için)
export async function getAllFirmalar() {
  try {
    const firmalar = await prisma.firma.findMany({
      include: {
        kullanicilar: {
          select: {
            id: true,
            rol: true,
            aktif: true,
            email: true,
            olusturmaTarihi: true,
            sonGiris: true
          }
        },
        istatistik: true,
        odemeGecmisi: {
          orderBy: { odemeTarihi: 'desc' },
          take: 1
        },
        _count: {
          select: {
            kullanicilar: true,
            duyurular: true
          }
        }
      },
      orderBy: { olusturmaTarihi: 'desc' }
    })

    return firmalar.map(firma => ({
      id: firma.id,
      ad: firma.ad,
      email: firma.email,
      telefon: firma.telefon,
      paketTipi: firma.paketTipi,
      aktif: firma.aktif,
      lisansBaslangic: firma.lisansBaslangic,
      lisansBitis: firma.lisansBitis,
      demoBitis: firma.demoBitis,
      olusturmaTarihi: firma.olusturmaTarihi,
      
      // Öğrenci istatistikleri
      toplamOgrenci: firma.kullanicilar.filter(k => k.rol === 'OGRENCI').length,
      aktifOgrenci: firma.kullanicilar.filter(k => k.rol === 'OGRENCI' && k.aktif).length,
      toplamAdmin: firma.kullanicilar.filter(k => k.rol === 'FIRMA_ADMIN').length,
      
      // Son aktivite
      sonGiris: firma.kullanicilar.reduce((latest, user) => {
        if (!user.sonGiris) return latest
        return !latest || user.sonGiris > latest ? user.sonGiris : latest
      }, null),
      
      // Ödeme bilgisi
      sonOdeme: firma.odemeGecmisi[0] || null,
      
      // Duyuru sayısı
      toplamDuyuru: firma._count.duyurular,
      
      // Demo durumu
      isDemoActive: firma.demoBitis && firma.demoBitis > new Date(),
      demoKalanGun: firma.demoBitis ? Math.max(0, Math.ceil((firma.demoBitis - new Date()) / (1000 * 60 * 60 * 24))) : 0,
      
      // Yetkili kullanıcı email
      yetkiliEmail: firma.kullanicilar.find(k => k.rol === 'FIRMA_ADMIN')?.email || null
    }))
    
  } catch (error) {
    console.error('💥 Get all firmalar error:', error)
    return []
  }
}

// Toplam ciro hesapla
export async function getTotalCiro() {
  try {
    const toplamCiro = await prisma.odemeGecmisi.aggregate({
      where: {
        durum: 'tamamlandi'
      },
      _sum: {
        tutar: true
      },
      _count: {
        id: true
      }
    })

    const buAyBaslangic = new Date()
    buAyBaslangic.setDate(1)
    buAyBaslangic.setHours(0, 0, 0, 0)

    const buAyCiro = await prisma.odemeGecmisi.aggregate({
      where: {
        durum: 'tamamlandi',
        odemeTarihi: {
          gte: buAyBaslangic
        }
      },
      _sum: {
        tutar: true
      },
      _count: {
        id: true
      }
    })

    const gecenAyBaslangic = new Date()
    gecenAyBaslangic.setMonth(gecenAyBaslangic.getMonth() - 1)
    gecenAyBaslangic.setDate(1)
    gecenAyBaslangic.setHours(0, 0, 0, 0)

    const gecenAyBitis = new Date()
    gecenAyBitis.setDate(0)
    gecenAyBitis.setHours(23, 59, 59, 999)

    const gecenAyCiro = await prisma.odemeGecmisi.aggregate({
      where: {
        durum: 'tamamlandi',
        odemeTarihi: {
          gte: gecenAyBaslangic,
          lte: gecenAyBitis
        }
      },
      _sum: {
        tutar: true
      }
    })

    return {
      toplamCiro: Number(toplamCiro._sum.tutar || 0),
      toplamSatis: toplamCiro._count,
      buAyCiro: Number(buAyCiro._sum.tutar || 0),
      buAySatis: buAyCiro._count,
      gecenAyCiro: Number(gecenAyCiro._sum.tutar || 0),
      artisOrani: gecenAyCiro._sum.tutar > 0 
        ? ((Number(buAyCiro._sum.tutar || 0) - Number(gecenAyCiro._sum.tutar || 0)) / Number(gecenAyCiro._sum.tutar)) * 100
        : 0
    }
    
  } catch (error) {
    console.error('💥 Get total ciro error:', error)
    return {
      toplamCiro: 0,
      toplamSatis: 0,
      buAyCiro: 0,
      buAySatis: 0,
      gecenAyCiro: 0,
      artisOrani: 0
    }
  }
}

// Lisans anahtarı üret
export async function createActivationCode(data) {
  try {
    const { paketTipi, sureGun, adet = 1, prefix = 'EHL' } = data
    
    const kodlar = []
    
    for (let i = 0; i < adet; i++) {
      // Benzersiz kod üret
      const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase()
      const kod = `${prefix}${randomCode}`
      
      const aktivasyonKodu = await prisma.aktivasyonKodu.create({
        data: {
          kod,
          paketTipi,
          sureGun,
          gecerlilikTarihi: sureGun === 1 ? 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : // Demo kodları 7 gün geçerli
            null // Diğer kodlar sınırsız
        }
      })
      
      kodlar.push({
        id: aktivasyonKodu.id,
        kod: aktivasyonKodu.kod,
        paketTipi: aktivasyonKodu.paketTipi,
        sureGun: aktivasyonKodu.sureGun,
        gecerlilikTarihi: aktivasyonKodu.gecerlilikTarihi
      })
    }
    
    console.log(`✅ Created ${adet} activation codes`)
    return { success: true, kodlar }
    
  } catch (error) {
    console.error('💥 Create activation code error:', error)
    return { success: false, error: 'Aktivasyon kodu oluşturulamadı' }
  }
}

// Tüm aktivasyon kodlarını listele
export async function getAllActivationCodes() {
  try {
    const kodlar = await prisma.aktivasyonKodu.findMany({
      include: {
        kullananFirma: {
          select: {
            id: true,
            ad: true,
            email: true
          }
        }
      },
      orderBy: { olusturmaTarihi: 'desc' }
    })

    return kodlar.map(kod => ({
      id: kod.id,
      kod: kod.kod,
      paketTipi: kod.paketTipi,
      sureGun: kod.sureGun,
      kullanildi: kod.kullanildi,
      kullananFirma: kod.kullananFirma,
      kullanmaTarihi: kod.kullanmaTarihi,
      olusturmaTarihi: kod.olusturmaTarihi,
      gecerlilikTarihi: kod.gecerlilikTarihi,
      gecerli: !kod.gecerlilikTarihi || kod.gecerlilikTarihi > new Date(),
      kalanGun: kod.gecerlilikTarihi ? 
        Math.max(0, Math.ceil((kod.gecerlilikTarihi - new Date()) / (1000 * 60 * 60 * 24))) : 
        null
    }))
    
  } catch (error) {
    console.error('💥 Get all activation codes error:', error)
    return []
  }
}

// Sistem geneli istatistikleri
export async function getSystemStats() {
  try {
    const toplamFirma = await prisma.firma.count()
    const aktifFirma = await prisma.firma.count({
      where: { aktif: true }
    })
    
    const toplamOgrenci = await prisma.kullanici.count({
      where: { rol: 'OGRENCI' }
    })
    
    const aktifOgrenci = await prisma.kullanici.count({
      where: { 
        rol: 'OGRENCI',
        aktif: true
      }
    })

    const toplamSinav = await prisma.sinavSonuc.count()
    
    const basariliSinav = await prisma.sinavSonuc.count({
      where: {
        basariOrani: {
          gte: 70
        }
      }
    })

    const bugunBaslangic = new Date()
    bugunBaslangic.setHours(0, 0, 0, 0)

    const bugunAktivite = await prisma.kullanici.count({
      where: {
        sonGiris: {
          gte: bugunBaslangic
        }
      }
    })

    return {
      toplamFirma,
      aktifFirma,
      toplamOgrenci,
      aktifOgrenci,
      toplamSinav,
      basariliSinav,
      basariOrani: toplamSinav > 0 ? Math.round((basariliSinav / toplamSinav) * 100) : 0,
      bugunAktivite
    }
    
  } catch (error) {
    console.error('💥 Get system stats error:', error)
    return {
      toplamFirma: 0,
      aktifFirma: 0,
      toplamOgrenci: 0,
      aktifOgrenci: 0,
      toplamSinav: 0,
      basariliSinav: 0,
      basariOrani: 0,
      bugunAktivite: 0
    }
  }
}

// Firma oluştur (Super Admin için)
export async function createFirma(firmaData) {
  try {
    const firma = await prisma.firma.create({
      data: firmaData
    })
    
    console.log(`✅ Created firma: ${firma.ad}`)
    return firma
    
  } catch (error) {
    console.error('💥 Create firma error:', error)
    throw error
  }
}

export default prisma 