import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  type Relation
} from 'typeorm'
import { Email } from './Email.entity'

@Entity('labels')
export class Label {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'integer' })
  emailId!: number

  @ManyToOne(() => Email, (email) => email.labels)
  email!: Relation<Email>

  @Column({ type: 'varchar', length: 100 })
  name!: string
}