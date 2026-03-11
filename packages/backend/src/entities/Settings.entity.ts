import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm'

@Entity('settings')
@Unique(['key'])
export class Settings {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'varchar', length: 255 })
  key!: string

  @Column({ type: 'text' })
  value!: string
}