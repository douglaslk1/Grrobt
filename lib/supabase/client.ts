interface SupabaseClient {
  auth: {
    signUp: (credentials: { email: string; password: string }) => Promise<any>
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<any>
    signOut: () => Promise<any>
    getUser: (token?: string) => Promise<any>
    getSession: () => Promise<any>
  }
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (column: string, value: any) => Promise<any>
      execute: () => Promise<any>
    }
    insert: (data: any) => Promise<any>
    update: (data: any) => {
      eq: (column: string, value: any) => Promise<any>
    }
    delete: () => {
      eq: (column: string, value: any) => Promise<any>
    }
  }
  storage: {
    from: (bucket: string) => {
      upload: (path: string, file: File) => Promise<any>
      getPublicUrl: (path: string) => { data: { publicUrl: string } }
    }
  }
}

class CustomSupabaseClient implements SupabaseClient {
  private baseUrl: string
  private apiKey: string
  private session: any = null

  constructor(url: string, key: string) {
    this.baseUrl = url
    this.apiKey = key

    // Try to get session from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("supabase-session")
      if (stored) {
        try {
          this.session = JSON.parse(stored)
        } catch (e) {
          // Ignore parsing errors
        }
      }
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      apikey: this.apiKey,
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.session?.access_token) {
      headers["Authorization"] = `Bearer ${this.session.access_token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  auth = {
    signUp: async (credentials: {
      email: string
      password: string
      options?: {
        emailRedirectTo?: string
        data?: any
      }
    }) => {
      try {
        const payload: any = {
          email: credentials.email,
          password: credentials.password,
        }

        // Add user metadata if provided
        if (credentials.options?.data) {
          payload.data = credentials.options.data
        }

        // Add email redirect URL if provided
        if (credentials.options?.emailRedirectTo) {
          payload.confirm_url = credentials.options.emailRedirectTo
        }

        const data = await this.request("/auth/v1/signup", {
          method: "POST",
          body: JSON.stringify(payload),
        })

        if (data.error) {
          return { data: null, error: data.error }
        }

        return { data, error: null }
      } catch (error: any) {
        const errorMessage = error.message || "An error occurred during signup"
        console.error("[v0] Signup error:", errorMessage)
        return { data: null, error: { message: errorMessage } }
      }
    },

    signInWithPassword: async (credentials: { email: string; password: string }) => {
      try {
        const data = await this.request("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: JSON.stringify(credentials),
        })

        if (data.access_token) {
          this.session = data
          if (typeof window !== "undefined") {
            localStorage.setItem("supabase-session", JSON.stringify(data))
          }
        }

        return { data, error: null }
      } catch (error: any) {
        let errorMessage = "Invalid email or password"
        if (error.message?.includes("400")) {
          errorMessage = "Invalid email or password"
        } else if (error.message?.includes("422")) {
          errorMessage = "Please check your email and password"
        } else if (error.message?.includes("429")) {
          errorMessage = "Too many login attempts. Please try again later."
        }

        console.error("[v0] Login error:", error.message)
        return { data: null, error: { message: errorMessage } }
      }
    },

    signOut: async () => {
      try {
        await this.request("/auth/v1/logout", { method: "POST" })
        this.session = null
        if (typeof window !== "undefined") {
          localStorage.removeItem("supabase-session")
        }
        return { error: null }
      } catch (error) {
        return { error }
      }
    },

    getUser: async (token?: string) => {
      try {
        const headers: any = {}
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }

        const data = await this.request("/auth/v1/user", {
          method: "GET",
          headers,
        })
        return { data: { user: data }, error: null }
      } catch (error) {
        return { data: { user: null }, error }
      }
    },

    getSession: async () => {
      return { data: { session: this.session }, error: null }
    },
  }

  from = (table: string) => {
    return {
      select: (columns = "*") => ({
        eq: async (column: string, value: any) => {
          try {
            const data = await this.request(`/rest/v1/${table}?${column}=eq.${value}&select=${columns}`)
            return { data, error: null }
          } catch (error) {
            return { data: null, error }
          }
        },
        execute: async () => {
          try {
            const data = await this.request(`/rest/v1/${table}?select=${columns}`)
            return { data, error: null }
          } catch (error) {
            return { data: null, error }
          }
        },
      }),

      insert: async (insertData: any) => {
        try {
          const data = await this.request(`/rest/v1/${table}`, {
            method: "POST",
            body: JSON.stringify(insertData),
          })
          return { data, error: null }
        } catch (error) {
          return { data: null, error }
        }
      },

      update: (updateData: any) => ({
        eq: async (column: string, value: any) => {
          try {
            const data = await this.request(`/rest/v1/${table}?${column}=eq.${value}`, {
              method: "PATCH",
              body: JSON.stringify(updateData),
            })
            return { data, error: null }
          } catch (error) {
            return { data: null, error }
          }
        },
      }),

      delete: () => ({
        eq: async (column: string, value: any) => {
          try {
            const data = await this.request(`/rest/v1/${table}?${column}=eq.${value}`, {
              method: "DELETE",
            })
            return { data, error: null }
          } catch (error) {
            return { data: null, error }
          }
        },
      }),
    }
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, file: File) => {
        try {
          const formData = new FormData()
          formData.append("file", file)

          const response = await fetch(`${this.baseUrl}/storage/v1/object/${bucket}/${path}`, {
            method: "POST",
            headers: {
              apikey: this.apiKey,
              Authorization: `Bearer ${this.session?.access_token || this.apiKey}`,
            },
            body: formData,
          })

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`)
          }

          const data = await response.json()
          return { data, error: null }
        } catch (error) {
          return { data: null, error }
        }
      },

      getPublicUrl: (path: string) => ({
        data: {
          publicUrl: `${this.baseUrl}/storage/v1/object/public/${bucket}/${path}`,
        },
      }),
    }),
  }
}

export function createClient(): SupabaseClient {
  return new CustomSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
