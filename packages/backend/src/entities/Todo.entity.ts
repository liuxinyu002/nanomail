import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  type Relation
} from 'typeorm'
import { Email } from './Email.entity'

export type TodoUrgency = 'high' | 'medium' | 'low'
export type TodoStatus = 'pending' | 'in_progress' | 'completed'

@Entity('todos')
export class Todo {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'integer' })
  emailId!: number

  @ManyToOne(() => Email, (email) => email.todos)
  email!: Relation<Email>

  @Column({ type: 'text' })
  description!: string

  @Column({
    type: 'text',
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  })
  urgency!: TodoUrgency

  @Column({
    type: 'text',
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending'
  })
  status!: TodoStatus

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date
}