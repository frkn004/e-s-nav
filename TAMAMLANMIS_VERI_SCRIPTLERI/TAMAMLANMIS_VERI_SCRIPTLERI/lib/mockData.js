// Gerçek Veri Sistemi - Mock Data
export const REAL_DATA = {
  
  // Firmalar
  firmalar: {
    'istanbul_surucu': {
      id: 'istanbul_surucu',
      ad: 'İstanbul Sürücü Kursu',
      email: 'admin@istanbul-surucu.com',
      sifre_hash: '$2a$12$LQv3c1yqBwlVHpPp5vLg5.YuLgdg8/rD4KQ8bJz0Cc5yS4K2K8o4e', // 123456
      telefon: '0212 555 01 01',
      adres: 'Kadıköy Mh. Fahrettin Kerim Gökay Cd. No:42 Kadıköy/İstanbul',
      paket: 'PREMIUM',
      demo_mode: false,
      kayit_tarihi: '2024-01-15T09:00:00Z',
      lisans_bitis: '2024-12-31T23:59:59Z',
      durum: 'Aktif',
      logo: null,
      tema_rengi: '#3b82f6',
      yetkili_ad: 'Mehmet',
      yetkili_soyad: 'Yılmaz',
      lisans_kodu: 'EHLIYET-2024-PREMIUM-A1B2C3',
      ozellikler: {
        max_students: -1, // Sınırsız
        ai_questions_per_month: -1, // Sınırsız
        can_upload_books: true,
        can_customize_theme: true,
        priority_support: true
      },
      istatistikler: {
        toplam_ogrenci: 27,
        aktif_ogrenci: 24,
        toplam_sinav: 156,
        basarili_sinav: 132,
        ai_kullanim: 89,
        ortalama_basari: 84.6
      }
    }
  },

  // Kullanıcılar (Öğrenciler)
  kullanicilar: {
    'ahmet_yilmaz': {
      id: 'ahmet_yilmaz',
      ad: 'Ahmet',
      soyad: 'Yılmaz',
      email: 'ahmet@test.com',
      sifre_hash: '$2a$12$LQv3c1yqBwlVHpPp5vLg5.YuLgdg8/rD4KQ8bJz0Cc5yS4K2K8o4e', // 123456
      telefon: '0555 123 45 67',
      tc_no: '12345678901',
      dogum_tarihi: '1995-05-15',
      adres: 'Üsküdar, İstanbul',
      rol: 'OGRENCI',
      firma_id: 'istanbul_surucu',
      firma_adi: 'İstanbul Sürücü Kursu',
      kayit_tarihi: '2024-11-01T10:30:00Z',
      son_giris: '2024-12-02T08:15:00Z',
      durum: 'Aktif',
      sinav_istatistikleri: {
        toplam_sinav: 12,
        basarili_sinav: 10,
        ortalama_puan: 85.4,
        en_yuksek_puan: 95,
        son_sinav_tarihi: '2024-12-01T14:20:00Z'
      },
      hedefler: {
        haftalik_sinav: { hedef: 5, tamamlanan: 4 },
        aylık_ai_soru: { hedef: 50, tamamlanan: 42 },
        kitap_okuma: { hedef: 2, tamamlanan: 2 }
      }
    },
    'fatma_kaya': {
      id: 'fatma_kaya',
      ad: 'Fatma',
      soyad: 'Kaya',
      email: 'fatma.kaya@gmail.com',
      sifre_hash: '$2a$12$LQv3c1yqBwlVHpPp5vLg5.YuLgdg8/rD4KQ8bJz0Cc5yS4K2K8o4e',
      telefon: '0544 567 89 01',
      tc_no: '98765432109',
      dogum_tarihi: '1998-08-22',
      adres: 'Beşiktaş, İstanbul',
      rol: 'OGRENCI',
      firma_id: 'istanbul_surucu',
      firma_adi: 'İstanbul Sürücü Kursu',
      kayit_tarihi: '2024-10-15T14:45:00Z',
      son_giris: '2024-12-02T09:30:00Z',
      durum: 'Aktif',
      sinav_istatistikleri: {
        toplam_sinav: 18,
        basarili_sinav: 16,
        ortalama_puan: 88.7,
        en_yuksek_puan: 98,
        son_sinav_tarihi: '2024-12-02T11:15:00Z'
      },
      hedefler: {
        haftalik_sinav: { hedef: 5, tamamlanan: 5 },
        aylık_ai_soru: { hedef: 60, tamamlanan: 58 },
        kitap_okuma: { hedef: 3, tamamlanan: 3 }
      }
    },
    'mehmet_demir': {
      id: 'mehmet_demir',
      ad: 'Mehmet',
      soyad: 'Demir',
      email: 'mehmet.demir@outlook.com',
      sifre_hash: '$2a$12$LQv3c1yqBwlVHpPp5vLg5.YuLgdg8/rD4KQ8bJz0Cc5yS4K2K8o4e',
      telefon: '0532 789 01 23',
      tc_no: '11223344556',
      dogum_tarihi: '1992-12-03',
      adres: 'Şişli, İstanbul',
      rol: 'OGRENCI',
      firma_id: 'istanbul_surucu',
      firma_adi: 'İstanbul Sürücü Kursu',
      kayit_tarihi: '2024-09-20T16:20:00Z',
      son_giris: '2024-12-01T20:45:00Z',
      durum: 'Aktif',
      sinav_istatistikleri: {
        toplam_sinav: 8,
        basarili_sinav: 6,
        ortalama_puan: 76.3,
        en_yuksek_puan: 87,
        son_sinav_tarihi: '2024-11-30T19:30:00Z'
      },
      hedefler: {
        haftalik_sinav: { hedef: 3, tamamlanan: 2 },
        aylık_ai_soru: { hedef: 30, tamamlanan: 25 },
        kitap_okuma: { hedef: 2, tamamlanan: 1 }
      }
    }
  },

  // Admin kullanıcıları
  adminler: {
    'admin_main': {
      id: 'admin_main',
      ad: 'Sistem',
      soyad: 'Admin',
      email: 'admin@ehliyet-saas.com',
      sifre_hash: '$2a$12$kGx3wVQk8j9/2l5kY8vBF.XB5v6r/7LQN4M8T9/3aL6rK5sH2c8eP', // admin123
      rol: 'ADMIN',
      yetki_seviyesi: 'SUPER_ADMIN',
      son_giris: '2024-12-02T07:00:00Z'
    }
  },

  // Son Aktiviteler
  aktiviteler: {
    istanbul_surucu: [
      {
        id: 'act_001',
        tip: 'sinav',
        kullanici_id: 'fatma_kaya',
        kullanici_adi: 'Fatma Kaya',
        baslik: 'Deneme Sınavı Tamamlandı',
        aciklama: '18/20 doğru (%90 başarı)',
        tarih: '2024-12-02T11:15:00Z',
        icon: '📝',
        renk: '#10b981'
      },
      {
        id: 'act_002',
        tip: 'ai_soru',
        kullanici_id: 'ahmet_yilmaz',
        kullanici_adi: 'Ahmet Yılmaz',
        baslik: 'AI Soru Soruldu',
        aciklama: 'Trafik işaretleri - 8 soru',
        tarih: '2024-12-02T10:30:00Z',
        icon: '🤖',
        renk: '#8b5cf6'
      },
      {
        id: 'act_003',
        tip: 'kitap',
        kullanici_id: 'mehmet_demir',
        kullanici_adi: 'Mehmet Demir',
        baslik: 'Kitap Bölümü Okundu',
        aciklama: 'İlk Yardım - ABC Kuralı (15 dk)',
        tarih: '2024-12-02T09:45:00Z',
        icon: '📚',
        renk: '#3b82f6'
      },
      {
        id: 'act_004',
        tip: 'giris',
        kullanici_id: 'fatma_kaya',
        kullanici_adi: 'Fatma Kaya',
        baslik: 'Sisteme Giriş Yaptı',
        aciklama: 'Öğrenci paneline erişim',
        tarih: '2024-12-02T09:30:00Z',
        icon: '🔓',
        renk: '#f59e0b'
      },
      {
        id: 'act_005',
        tip: 'hedef',
        kullanici_id: 'fatma_kaya',
        kullanici_adi: 'Fatma Kaya',
        baslik: 'Haftalık Hedef Tamamlandı',
        aciklama: '5/5 sınav hedefi başarıyla tamamlandı',
        tarih: '2024-12-01T22:15:00Z',
        icon: '🏆',
        renk: '#f59e0b'
      }
    ]
  },

  // Sınav Geçmişi
  sinav_gecmisi: {
    ahmet_yilmaz: [
      {
        id: 'exam_001',
        tarih: '2024-12-01T14:20:00Z',
        toplam_soru: 20,
        dogru_cevap: 17,
        yanlis_cevap: 3,
        bos_cevap: 0,
        basari_orani: 85,
        sure: '12 dk 30 sn',
        kategori: 'Genel Kültür',
        detay: {
          trafik_kurallari: { dogru: 8, toplam: 10 },
          trafik_isaret: { dogru: 5, toplam: 6 },
          ilk_yardim: { dogru: 4, toplam: 4 }
        }
      },
      {
        id: 'exam_002',
        tarih: '2024-11-30T16:45:00Z',
        toplam_soru: 20,
        dogru_cevap: 16,
        yanlis_cevap: 4,
        bos_cevap: 0,
        basari_orani: 80,
        sure: '15 dk 20 sn',
        kategori: 'Genel Kültür'
      }
    ],
    fatma_kaya: [
      {
        id: 'exam_003',
        tarih: '2024-12-02T11:15:00Z',
        toplam_soru: 20,
        dogru_cevap: 18,
        yanlis_cevap: 2,
        bos_cevap: 0,
        basari_orani: 90,
        sure: '11 dk 45 sn',
        kategori: 'Genel Kültür'
      }
    ]
  },

  // AI Chat Geçmişi
  ai_chat_gecmisi: {
    ahmet_yilmaz: [
      {
        id: 'chat_001',
        tarih: '2024-12-02T10:30:00Z',
        soru: 'Dur işaretinin anlamı nedir?',
        cevap: 'Dur işareti, aracın tamamen durması gerektiğini belirtir. Bu işaret karşısında araç sürücüsü...',
        kategori: 'Trafik İşaretleri',
        memnuniyet: 5
      },
      {
        id: 'chat_002',
        tarih: '2024-12-02T10:15:00Z',
        soru: 'ABS sistemi nedir?',
        cevap: 'ABS (Anti-lock Braking System) frenleme esnasında tekerleklerin kilitlenmesini önleyen güvenlik sistemidir...',
        kategori: 'Araç Tekniği',
        memnuniyet: 4
      }
    ]
  },

  // Bildirimler
  bildirimler: {
    istanbul_surucu: [
      {
        id: 'notif_001',
        tip: 'duyuru',
        baslik: 'Yeni Soru Bankası Eklendi',
        mesaj: '2024 güncel sorular sisteme yüklendi. Öğrencileriniz yeni soruları çözebilir.',
        tarih: '2024-12-01T09:00:00Z',
        okundu: false,
        hedef: 'firma'
      },
      {
        id: 'notif_002',
        tip: 'uyari',
        baslik: 'Premium Paket Hatırlatması',
        mesaj: 'Premium paketiniz 30 gün sonra sona erecek. Yenileme işlemi yapabilirsiniz.',
        tarih: '2024-11-30T10:00:00Z',
        okundu: true,
        hedef: 'firma'
      }
    ],
    ogrenciler: [
      {
        id: 'notif_003',
        tip: 'basari',
        baslik: 'Tebrikler! Hedef Tamamlandı',
        mesaj: 'Bu hafta 5 sınav hedefini başarıyla tamamladınız!',
        tarih: '2024-12-01T22:15:00Z',
        okundu: false,
        hedef_kullanici: 'fatma_kaya'
      },
      {
        id: 'notif_004',
        tip: 'motivasyon',
        baslik: 'Sınav Zamanı!',
        mesaj: 'Bugün henüz sınav girmediniz. Hedeflerinize ulaşmak için sınava başlayın.',
        tarih: '2024-12-02T18:00:00Z',
        okundu: false,
        hedef_kullanici: 'mehmet_demir'
      }
    ]
  },

  // İstatistikler - Anlık
  istatistikler: {
    günlük: {
      tarih: '2024-12-02',
      toplam_giris: 24,
      toplam_sinav: 18,
      toplam_ai_soru: 45,
      aktif_kullanici: 18,
      ortalama_basari: 84.2
    },
    haftalık: {
      tarih_araligi: '2024-11-25 / 2024-12-01',
      toplam_sinav: 156,
      yeni_kullanici: 3,
      basarili_sinav: 132,
      ai_kullanim: 298
    },
    aylık: {
      tarih_araligi: '2024-11-01 / 2024-11-30',
      yeni_firma: 2,
      toplam_gelir: 1248,
      aktif_firma: 2,
      kullanici_artisi: 8
    }
  }
};

// Veri erişim fonksiyonları
export const getRealData = {
  
  // Firma verilerini getir
  getFirma: (firmaId) => {
    return REAL_DATA.firmalar[firmaId] || null;
  },

  // Firma öğrencilerini getir
  getFirmaOgrencileri: (firmaId) => {
    return Object.values(REAL_DATA.kullanicilar).filter(user => user.firma_id === firmaId);
  },

  // Kullanıcı verilerini getir
  getKullanici: (kullaniciId) => {
    return REAL_DATA.kullanicilar[kullaniciId] || null;
  },

  // Email ile kullanıcı bul
  getKullaniciByEmail: (email) => {
    return Object.values(REAL_DATA.kullanicilar).find(user => user.email === email) ||
           Object.values(REAL_DATA.adminler).find(user => user.email === email) ||
           Object.values(REAL_DATA.firmalar).find(firma => firma.email === email) || null;
  },

  // Firma aktivitelerini getir
  getFirmaAktiviteleri: (firmaId) => {
    return REAL_DATA.aktiviteler[firmaId] || [];
  },

  // Kullanıcı sınav geçmişi
  getKullaniciSinavlar: (kullaniciId) => {
    return REAL_DATA.sinav_gecmisi[kullaniciId] || [];
  },

  // AI chat geçmişi
  getAIChatGecmisi: (kullaniciId) => {
    return REAL_DATA.ai_chat_gecmisi[kullaniciId] || [];
  },

  // Bildirimler
  getBildirimler: (hedef, kullaniciId = null) => {
    if (hedef === 'ogrenci' && kullaniciId) {
      return REAL_DATA.bildirimler.ogrenciler.filter(b => b.hedef_kullanici === kullaniciId);
    }
    return REAL_DATA.bildirimler[hedef] || [];
  },

  // İstatistikler
  getIstatistikler: (tip) => {
    return REAL_DATA.istatistikler[tip] || null;
  }
}; 