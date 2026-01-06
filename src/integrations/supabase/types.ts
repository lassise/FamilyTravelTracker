export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          attachment_urls: string[] | null
          booking_type: string
          check_in: string | null
          check_out: string | null
          confirmation_number: string | null
          cost: number | null
          created_at: string
          currency: string | null
          id: string
          latitude: number | null
          location_address: string | null
          location_name: string | null
          longitude: number | null
          notes: string | null
          provider: string | null
          title: string
          trip_id: string
          updated_at: string
        }
        Insert: {
          attachment_urls?: string[] | null
          booking_type: string
          check_in?: string | null
          check_out?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          provider?: string | null
          title: string
          trip_id: string
          updated_at?: string
        }
        Update: {
          attachment_urls?: string[] | null
          booking_type?: string
          check_in?: string | null
          check_out?: string | null
          confirmation_number?: string | null
          cost?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          notes?: string | null
          provider?: string | null
          title?: string
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      city_visits: {
        Row: {
          city_name: string
          country_id: string
          created_at: string | null
          id: string
          notes: string | null
          user_id: string | null
          visit_date: string | null
        }
        Insert: {
          city_name: string
          country_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          user_id?: string | null
          visit_date?: string | null
        }
        Update: {
          city_name?: string
          country_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          user_id?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "city_visits_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          continent: string
          created_at: string | null
          flag: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          continent: string
          created_at?: string | null
          flag: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          continent?: string
          created_at?: string | null
          flag?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      country_visit_details: {
        Row: {
          approximate_month: number | null
          approximate_year: number | null
          country_id: string
          created_at: string | null
          end_date: string | null
          id: string
          is_approximate: boolean | null
          notes: string | null
          number_of_days: number | null
          trip_name: string | null
          updated_at: string | null
          user_id: string | null
          visit_date: string | null
        }
        Insert: {
          approximate_month?: number | null
          approximate_year?: number | null
          country_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_approximate?: boolean | null
          notes?: string | null
          number_of_days?: number | null
          trip_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_date?: string | null
        }
        Update: {
          approximate_month?: number | null
          approximate_year?: number | null
          country_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_approximate?: boolean | null
          notes?: string | null
          number_of_days?: number | null
          trip_name?: string | null
          updated_at?: string | null
          user_id?: string | null
          visit_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_visit_details_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      country_visits: {
        Row: {
          country_id: string | null
          created_at: string | null
          family_member_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string | null
          family_member_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_visits_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "country_visits_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      country_wishlist: {
        Row: {
          country_id: string | null
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          country_id?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          country_id?: string | null
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "country_wishlist_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: true
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string | null
          description: string
          expense_date: string | null
          id: string
          paid_by: string | null
          receipt_url: string | null
          trip_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          currency?: string | null
          description: string
          expense_date?: string | null
          id?: string
          paid_by?: string | null
          receipt_url?: string | null
          trip_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string | null
          description?: string
          expense_date?: string | null
          id?: string
          paid_by?: string | null
          receipt_url?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      family_group_members: {
        Row: {
          created_at: string
          family_group_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          family_group_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          family_group_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_group_members_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          id: string
          invite_code: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      family_members: {
        Row: {
          avatar: string
          color: string
          created_at: string | null
          id: string
          name: string
          role: string
          user_id: string | null
        }
        Insert: {
          avatar: string
          color: string
          created_at?: string | null
          id?: string
          name: string
          role: string
          user_id?: string | null
        }
        Update: {
          avatar?: string
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      itinerary_days: {
        Row: {
          created_at: string
          date: string | null
          day_number: number
          id: string
          notes: string | null
          plan_b: string | null
          title: string | null
          trip_id: string
          updated_at: string
          weather_notes: string | null
        }
        Insert: {
          created_at?: string
          date?: string | null
          day_number: number
          id?: string
          notes?: string | null
          plan_b?: string | null
          title?: string | null
          trip_id: string
          updated_at?: string
          weather_notes?: string | null
        }
        Update: {
          created_at?: string
          date?: string | null
          day_number?: number
          id?: string
          notes?: string | null
          plan_b?: string | null
          title?: string | null
          trip_id?: string
          updated_at?: string
          weather_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_days_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          category: string | null
          cost_estimate: number | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          is_kid_friendly: boolean | null
          is_stroller_friendly: boolean | null
          itinerary_day_id: string
          latitude: number | null
          location_address: string | null
          location_name: string | null
          longitude: number | null
          requires_reservation: boolean | null
          reservation_info: string | null
          sort_order: number
          start_time: string | null
          time_slot: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_kid_friendly?: boolean | null
          is_stroller_friendly?: boolean | null
          itinerary_day_id: string
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          requires_reservation?: boolean | null
          reservation_info?: string | null
          sort_order?: number
          start_time?: string | null
          time_slot?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_estimate?: number | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          is_kid_friendly?: boolean | null
          is_stroller_friendly?: boolean | null
          itinerary_day_id?: string
          latitude?: number | null
          location_address?: string | null
          location_name?: string | null
          longitude?: number | null
          requires_reservation?: boolean | null
          reservation_info?: string | null
          sort_order?: number
          start_time?: string | null
          time_slot?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_itinerary_day_id_fkey"
            columns: ["itinerary_day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_items: {
        Row: {
          assigned_to: string | null
          category: string | null
          created_at: string
          id: string
          is_packed: boolean | null
          item_name: string
          notes: string | null
          packing_list_id: string
          quantity: number | null
          sort_order: number | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_packed?: boolean | null
          item_name: string
          notes?: string | null
          packing_list_id: string
          quantity?: number | null
          sort_order?: number | null
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_packed?: boolean | null
          item_name?: string
          notes?: string | null
          packing_list_id?: string
          quantity?: number | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packing_items_packing_list_id_fkey"
            columns: ["packing_list_id"]
            isOneToOne: false
            referencedRelation: "packing_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      packing_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          template_type: string | null
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          template_type?: string | null
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template_type?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packing_lists_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          home_country: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          home_country?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          home_country?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_kid_friendly: boolean | null
          latitude: number | null
          location_address: string | null
          longitude: number | null
          name: string
          notes: string | null
          rating: number | null
          source: string | null
          trip_id: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_kid_friendly?: boolean | null
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          name: string
          notes?: string | null
          rating?: number | null
          source?: string | null
          trip_id?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_kid_friendly?: boolean | null
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          name?: string
          notes?: string | null
          rating?: number | null
          source?: string | null
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_places_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_places_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      share_profiles: {
        Row: {
          created_at: string
          custom_headline: string | null
          id: string
          is_public: boolean | null
          share_token: string
          show_map: boolean | null
          show_photos: boolean | null
          show_stats: boolean | null
          show_wishlist: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_headline?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string
          show_map?: boolean | null
          show_photos?: boolean | null
          show_stats?: boolean | null
          show_wishlist?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_headline?: string | null
          id?: string
          is_public?: boolean | null
          share_token?: string
          show_map?: boolean | null
          show_photos?: boolean | null
          show_stats?: boolean | null
          show_wishlist?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      travel_goals: {
        Row: {
          completed_at: string | null
          created_at: string
          deadline: string | null
          goal_type: string
          id: string
          is_completed: boolean
          target_count: number
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          goal_type?: string
          id?: string
          is_completed?: boolean
          target_count?: number
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deadline?: string | null
          goal_type?: string
          id?: string
          is_completed?: boolean
          target_count?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      travel_photos: {
        Row: {
          caption: string | null
          country_id: string | null
          created_at: string
          id: string
          photo_url: string
          taken_at: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          photo_url: string
          taken_at?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          country_id?: string | null
          created_at?: string
          id?: string
          photo_url?: string
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_photos_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_settings: {
        Row: {
          created_at: string | null
          home_country: string
          home_country_code: string
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          home_country?: string
          home_country_code?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          home_country?: string
          home_country_code?: string
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trip_emergency_info: {
        Row: {
          created_at: string
          custom_notes: string | null
          embassy_info: string | null
          emergency_number: string | null
          hospital_address: string | null
          hospital_name: string | null
          hospital_phone: string | null
          id: string
          insurance_info: string | null
          pharmacy_address: string | null
          pharmacy_name: string | null
          police_number: string | null
          trip_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_notes?: string | null
          embassy_info?: string | null
          emergency_number?: string | null
          hospital_address?: string | null
          hospital_name?: string | null
          hospital_phone?: string | null
          id?: string
          insurance_info?: string | null
          pharmacy_address?: string | null
          pharmacy_name?: string | null
          police_number?: string | null
          trip_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_notes?: string | null
          embassy_info?: string | null
          emergency_number?: string | null
          hospital_address?: string | null
          hospital_name?: string | null
          hospital_phone?: string | null
          id?: string
          insurance_info?: string | null
          pharmacy_address?: string | null
          pharmacy_name?: string | null
          police_number?: string | null
          trip_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_emergency_info_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          itinerary_day_id: string | null
          itinerary_item_id: string | null
          trip_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          itinerary_day_id?: string | null
          itinerary_item_id?: string | null
          trip_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          itinerary_day_id?: string | null
          itinerary_item_id?: string | null
          trip_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_notes_itinerary_day_id_fkey"
            columns: ["itinerary_day_id"]
            isOneToOne: false
            referencedRelation: "itinerary_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_notes_itinerary_item_id_fkey"
            columns: ["itinerary_item_id"]
            isOneToOne: false
            referencedRelation: "itinerary_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_notes_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_total: number | null
          cover_image: string | null
          created_at: string
          currency: string | null
          destination: string | null
          end_date: string | null
          family_group_id: string | null
          id: string
          interests: string[] | null
          kids_ages: number[] | null
          notes: string | null
          pace_preference: string | null
          start_date: string | null
          status: string | null
          title: string
          trip_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_total?: number | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          destination?: string | null
          end_date?: string | null
          family_group_id?: string | null
          id?: string
          interests?: string[] | null
          kids_ages?: number[] | null
          notes?: string | null
          pace_preference?: string | null
          start_date?: string | null
          status?: string | null
          title: string
          trip_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_total?: number | null
          cover_image?: string | null
          created_at?: string
          currency?: string | null
          destination?: string | null
          end_date?: string | null
          family_group_id?: string | null
          id?: string
          interests?: string[] | null
          kids_ages?: number[] | null
          notes?: string | null
          pace_preference?: string | null
          start_date?: string | null
          status?: string | null
          title?: string
          trip_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_family_group_id_fkey"
            columns: ["family_group_id"]
            isOneToOne: false
            referencedRelation: "family_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      visit_family_members: {
        Row: {
          created_at: string | null
          family_member_id: string
          id: string
          user_id: string
          visit_id: string
        }
        Insert: {
          created_at?: string | null
          family_member_id: string
          id?: string
          user_id: string
          visit_id: string
        }
        Update: {
          created_at?: string | null
          family_member_id?: string
          id?: string
          user_id?: string
          visit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visit_family_members_family_member_id_fkey"
            columns: ["family_member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visit_family_members_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "country_visit_details"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_group_role: {
        Args: {
          _group_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member", "viewer"],
    },
  },
} as const
